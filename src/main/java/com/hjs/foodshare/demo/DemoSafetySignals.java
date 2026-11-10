package com.hjs.foodshare.demo;

import java.util.regex.Pattern;

/**
 * Strictly high-certainty and context-dependent cues.
 * Neither a generative model nor this matcher can permanently restrict an account
 * for uncertain wording, food descriptions or a quoted discussion of language.
 */
public final class DemoSafetySignals {
    private DemoSafetySignals() {}

    private static final Pattern DIRECTED_INSULT = Pattern.compile(
            "(?:개새끼|개새꺄|씨발놈|씨발년|시발놈|시발년|병신아|병신새끼|죽여버릴|뒤져버려|"
            + "꺼져\\s*병신|너\\s*(?:는|진짜|정말)?\\s*병신|니가\\s*병신|야\\s*씨발)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern EXPLICIT_SEXUAL_SOLICITATION = Pattern.compile(
            "(?:(?:너랑|당신이랑|나랑|우리|같이)\\s*(?:섹스|성관계)\\s*(?:하자|할래|해줘|하실래)|"
            + "(?:야한|벗은|누드)\\s*(?:사진|영상)\\s*(?:보내|보여|줘)|"
            + "(?:가슴|성기)\\s*(?:보여|만져|까봐)|"
            + "(?:성적인\\s*행위)\\s*(?:하자|해줘))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern QUOTE_OR_DISCUSSION = Pattern.compile(
            "(?:예시|예문|욕설\\s*(?:뜻|표현|단어)|무슨\\s*뜻|인용|대사|설명해|뜻이\\s*뭐|"
            + "이런\\s*말|성교육|문법|사전|뉴스|신고|피해)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /**
     * Offensive content is rejected before it enters the simulated conversation.
     * Avoid counting ambiguous examples or educational discussion.
     */
    public static boolean unmistakableHarassment(String message) {
        if (message == null || message.length() < 3) return false;
        String cleaned = message.replaceAll("[\\u200B-\\u200D\\uFEFF]", "")
                .replaceAll("\\s+", " ").strip();
        if (QUOTE_OR_DISCUSSION.matcher(cleaned).find()) return false;
        return DIRECTED_INSULT.matcher(cleaned).find()
                || EXPLICIT_SEXUAL_SOLICITATION.matcher(cleaned).find();
    }

    /**
     * A model's image-only verdict NEVER restricts the user.
     * Only very explicit commercial non-food terms in text may corroborate
     * an unrelated result; uncertain or mixed-purpose posts are allowed.
     */
    public static boolean clearOffTopicText(String title, String details, String ingredient) {
        String text = String.join(" ", safe(title), safe(details), safe(ingredient)).toLowerCase();
        boolean explicitlyNonFood = Pattern.compile(
                "(?:코인\\s*투자|암호화폐\\s*투자|주식\\s*리딩|불법\\s*도박|토토\\s*사이트|"
                + "대출\\s*상담|성인\\s*광고|중고\\s*(?:휴대폰|노트북|그래픽카드|자동차)|"
                + "게임\\s*계정\\s*(?:판매|거래))").matcher(text).find();
        boolean plausibleFood = Pattern.compile(
                "(?:식재료|음식|식품|채소|과일|농산물|고기|육류|생선|해산물|쌀|밀가루|"
                + "계란|달걀|김치|과자|요리|반찬|소금|소스|버터|우유|감자|당근|토마토|"
                + "양파|사과|배추|주방|조리|주스|커피|식사|도시락|냉장|냉동|장보기)"
        ).matcher(text).find();
        return explicitlyNonFood && !plausibleFood;
    }

    private static String safe(String value) { return value == null ? "" : value; }
}
