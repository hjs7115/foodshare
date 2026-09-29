package com.hjs.foodshare.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hjs.foodshare.ai.domain.ConfidenceLevel;
import com.hjs.foodshare.ai.domain.OpenStatus;
import com.hjs.foodshare.ai.domain.QualityGrade;
import com.hjs.foodshare.ai.domain.StorageMethod;
import com.hjs.foodshare.ai.dto.IngredientVisionResult;
import com.hjs.foodshare.global.exception.BusinessException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Iterator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class OpenAiIngredientVisionClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public OpenAiIngredientVisionClient(
            ObjectMapper objectMapper,
            @Value("${app.ai.openai-api-key:}") String apiKey,
            @Value("${app.ai.model:gpt-4o-mini}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public IngredientVisionResult analyze(
            MultipartFile image,
            StorageMethod storageMethod,
            OpenStatus openStatus,
            LocalDate purchaseDate
    ) {
        if (apiKey.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 분석 키가 설정되지 않았습니다. 서버의 OPENAI_API_KEY를 확인해주세요.");
        }

        try {
            ObjectNode requestBody = buildRequest(image, storageMethod, openStatus, purchaseDate);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                JsonNode errorBody = objectMapper.readTree(response.body());
                String errorCode = errorBody.path("error").path("code").asText();
                if ("credit_balance_exhausted".equals(errorCode) || "insufficient_quota".equals(errorCode)) {
                    throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                            "AI 분석 서비스의 API 크레딧이 부족합니다. 서버 결제 설정을 확인해주세요.");
                }
                if (response.statusCode() == 401) {
                    throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                            "AI 분석 서비스 인증에 실패했습니다. 서버 API 키를 확인해주세요.");
                }
                throw new BusinessException(HttpStatus.BAD_GATEWAY, "AI 분석 서비스 응답을 받지 못했습니다.");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String outputText = findOutputText(root.path("output"));
            if (outputText == null || outputText.isBlank()) {
                throw new BusinessException(HttpStatus.BAD_GATEWAY, "AI 분석 결과가 비어 있습니다.");
            }

            JsonNode result = objectMapper.readTree(outputText);
            int minDays = clamp(result.path("estimatedConsumptionDaysMin").asInt(), 0, 30);
            int maxDays = clamp(result.path("estimatedConsumptionDaysMax").asInt(), minDays, 60);
            return new IngredientVisionResult(
                    result.path("ingredientName").asText("식재료"),
                    QualityGrade.valueOf(result.path("qualityGrade").asText("FAIR")),
                    result.path("qualityReason").asText("사진에서 확인 가능한 외관 정보를 기준으로 분석했습니다."),
                    minDays,
                    maxDays,
                    ConfidenceLevel.valueOf(result.path("confidenceLevel").asText("LOW"))
            );
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "AI 분석 요청이 중단되었습니다.");
        } catch (IOException | IllegalArgumentException exception) {
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "AI 분석 결과를 처리하지 못했습니다.");
        }
    }

    public String modelVersion() {
        return model;
    }

    private ObjectNode buildRequest(
            MultipartFile image,
            StorageMethod storageMethod,
            OpenStatus openStatus,
            LocalDate purchaseDate
    ) throws IOException {
        String mimeType = image.getContentType() == null ? "image/jpeg" : image.getContentType();
        String imageUrl = "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(image.getBytes());
        String metadata = "보관 방식: " + storageMethod
                + "\n개봉 여부: " + openStatus
                + "\n구매일: " + (purchaseDate == null ? "미입력" : purchaseDate);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("store", false);
        body.put("max_output_tokens", 500);
        body.put("instructions", "사진에서 보이는 식재료의 품목과 외관 상태를 분석하세요. "
                + "보관 방식, 개봉 여부, 구매일을 함께 고려해 권장 소비 예상 기간을 보수적으로 추정하세요. "
                + "사진만으로 섭취 안전을 보장하거나 단정하지 마세요. confidenceLevel은 사진 선명도와 입력 정보 충분성에 따라 HIGH, MEDIUM, LOW 중 하나만 선택하세요. "
                + "qualityReason은 한국어 한 문장으로 작성하세요.");

        ArrayNode content = objectMapper.createArrayNode();
        content.add(objectMapper.createObjectNode().put("type", "input_text").put("text", metadata));
        content.add(objectMapper.createObjectNode().put("type", "input_image").put("image_url", imageUrl).put("detail", "high"));
        ObjectNode message = objectMapper.createObjectNode().put("role", "user");
        message.set("content", content);
        body.set("input", objectMapper.createArrayNode().add(message));

        ObjectNode schema = objectMapper.createObjectNode().put("type", "object").put("additionalProperties", false);
        ObjectNode properties = objectMapper.createObjectNode();
        properties.set("ingredientName", stringSchema());
        properties.set("qualityGrade", enumSchema("EXCELLENT", "GOOD", "FAIR", "POOR"));
        properties.set("qualityReason", stringSchema());
        properties.set("estimatedConsumptionDaysMin", integerSchema(0, 30));
        properties.set("estimatedConsumptionDaysMax", integerSchema(0, 60));
        properties.set("confidenceLevel", enumSchema("HIGH", "MEDIUM", "LOW"));
        schema.set("properties", properties);
        schema.set("required", objectMapper.createArrayNode()
                .add("ingredientName")
                .add("qualityGrade")
                .add("qualityReason")
                .add("estimatedConsumptionDaysMin")
                .add("estimatedConsumptionDaysMax")
                .add("confidenceLevel"));

        ObjectNode format = objectMapper.createObjectNode()
                .put("type", "json_schema")
                .put("name", "ingredient_analysis")
                .put("strict", true);
        format.set("schema", schema);
        ObjectNode text = objectMapper.createObjectNode();
        text.set("format", format);
        body.set("text", text);
        return body;
    }

    private ObjectNode stringSchema() {
        return objectMapper.createObjectNode().put("type", "string");
    }

    private ObjectNode integerSchema(int minimum, int maximum) {
        return objectMapper.createObjectNode().put("type", "integer").put("minimum", minimum).put("maximum", maximum);
    }

    private ObjectNode enumSchema(String... values) {
        ObjectNode schema = objectMapper.createObjectNode().put("type", "string");
        ArrayNode enumValues = objectMapper.createArrayNode();
        for (String value : values) {
            enumValues.add(value);
        }
        schema.set("enum", enumValues);
        return schema;
    }

    private String findOutputText(JsonNode node) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        if (node.isObject() && "output_text".equals(node.path("type").asText()) && node.has("text")) {
            return node.path("text").asText();
        }
        Iterator<JsonNode> children = node.elements();
        while (children.hasNext()) {
            String value = findOutputText(children.next());
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }
}
