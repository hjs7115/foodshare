package com.hjs.foodshare.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.user.domain.User;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Looks up real public meeting landmarks near the human participant.
 * Never invents a business when maps or location data are unavailable.
 * No HTTP call should run inside a database transaction.
 */
@Component
public class DemoMeetupService {
    public record Point(Double latitude, Double longitude) {}
    public record Place(String name, String category, int distanceMeters) {}

    private static final Pattern PLACE_QUESTION = Pattern.compile(
            "(어디서|어디로|어디\\s*쪽|어느\\s*쪽|장소|위치|만날\\s*곳|만나는\\s*곳|"
            + "만날\\s*장소|어디에서|근처\\s*(?:편의점|카페|식당)|"
            + "(?:편의점|카페|식당)\\s*앞(?:에서|은|이))");
    private static final Pattern CHAIN = Pattern.compile(
            "(CU\\b|GS25|세븐일레븐|이마트24|미니스톱|스타벅스|투썸플레이스|이디야|"
            + "메가MGC|메가커피|컴포즈커피|빽다방|파리바게뜨|뚜레쥬르)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern UNSUITABLE = Pattern.compile(
            "(모텔|유흥|노래주점|성인|단란주점|호텔객실|배달전문|무인텔)");
    private static final String[] CATEGORIES = {"CS2", "CE7", "FD6"};
    private static final String GENERIC_REPLY =
            "근처 편의점이나 카페 앞에서 만나면 찾기 편할 것 같아요. 편하신 장소가 있을까요?";

    private final ObjectMapper mapper;
    private final String kakaoRestKey;
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2)).build();

    public DemoMeetupService(ObjectMapper mapper,
            @Value("${app.maps.kakao-rest-api-key:}") String kakaoRestKey) {
        this.mapper = mapper;
        this.kakaoRestKey = kakaoRestKey == null ? "" : kakaoRestKey.strip();
    }

    /** Prefer human profile coordinates; fall back to the trade post position. */
    public static Point nearHuman(User human, Post post) {
        if (human != null && valid(human.getLatitude(), human.getLongitude()))
            return new Point(human.getLatitude(), human.getLongitude());
        if (post != null && valid(post.getLatitude(), post.getLongitude()))
            return new Point(post.getLatitude(), post.getLongitude());
        return null;
    }

    private static boolean valid(Double lat, Double lng) {
        return lat != null && lng != null && Double.isFinite(lat) && Double.isFinite(lng)
                && lat >= 33.0 && lat <= 39.1 && lng >= 124.0 && lng <= 132.0;
    }

    /** Only actual questions about meetup locations trigger a map search. */
    public static boolean asksForMeetingPlace(String context) {
        if (context == null || context.isBlank()) return false;
        String last = "";
        for (String line : context.split("\n")) {
            String trimmed = line.strip();
            if (trimmed.startsWith("요청자:") || trimmed.startsWith("게시글 작성자:")
                    || trimmed.startsWith("체험자:")) {
                last = trimmed.substring(trimmed.indexOf(':') + 1).strip();
            }
        }
        return !last.isBlank() && PLACE_QUESTION.matcher(last).find();
    }

    /**
     * Returns null for ordinary conversation. For meetup questions, returns either
     * a map-verified place or an unnamed fallback: never hallucinate a place.
     */
    public String suggest(String context, Point around) {
        if (!asksForMeetingPlace(context)) return null;
        if (around == null || !valid(around.latitude(), around.longitude())
                || kakaoRestKey.isBlank()) return GENERIC_REPLY;
        List<Place> verified = new ArrayList<>();
        for (String category : CATEGORIES) verified.addAll(findNearby(category, around));
        return choose(verified, context);
    }

    public static String choose(List<Place> found, String context) {
        if (found == null || found.isEmpty()) return GENERIC_REPLY;
        String last = context.substring(Math.max(0, context.lastIndexOf('\n'))).strip();
        String preferred = last.contains("카페") ? "CE7"
                : last.contains("식당") || last.contains("음식점") ? "FD6"
                : last.contains("편의점") ? "CS2" : "";
        Place chosen = found.stream()
                .filter(p -> p.name() != null && !p.name().isBlank()
                        && p.name().length() <= 70 && !UNSUITABLE.matcher(p.name()).find()
                        && p.distanceMeters() >= 0 && p.distanceMeters() <= 1200)
                .min(Comparator.comparingInt(p -> p.distanceMeters()
                        + (CHAIN.matcher(p.name()).find() ? -70 : 0)
                        + (!preferred.isBlank() && !preferred.equals(p.category()) ? 170 : 0)
                        + ("FD6".equals(p.category()) ? 70 : 0)))
                .orElse(null);
        if (chosen == null) return GENERIC_REPLY;
        return chosen.name() + " 앞에서 만나실래요? 찾기 쉬울 것 같아요.";
    }

    private List<Place> findNearby(String category, Point point) {
        try {
            String url = String.format(Locale.ROOT,
                    "https://dapi.kakao.com/v2/local/search/category.json"
                    + "?category_group_code=%s&x=%.6f&y=%.6f&radius=1200&sort=distance&size=10",
                    category, point.longitude(), point.latitude());
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("Authorization", "KakaoAK " + kakaoRestKey)
                    .header("Accept", "application/json")
                    .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return List.of();
            JsonNode documents = mapper.readTree(response.body()).path("documents");
            if (!documents.isArray()) return List.of();
            List<Place> results = new ArrayList<>();
            for (JsonNode doc : documents) {
                if (!category.equals(doc.path("category_group_code").asText())) continue;
                String name = doc.path("place_name").asText("").strip();
                int distance;
                try { distance = Integer.parseInt(doc.path("distance").asText()); }
                catch (NumberFormatException e) { continue; }
                if (name.length() < 2 || name.length() > 70
                        || distance < 0 || distance > 1200) continue;
                results.add(new Place(name, category, distance));
            }
            return results;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (Exception ignored) {
            // Quota / connection error: don't invent venues or affect trade completion.
            return List.of();
        }
    }
}
