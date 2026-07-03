package com.hjs.foodshare.user.domain;

public enum FreshnessGrade {
    CROWN("👑", "극상의 신뢰"),
    SPARKLE("✨", "신뢰 높은 유저"),
    SPROUT("🌱", "일반·신규 유저"),
    FALL_LEAF("🍂", "신선도 관리 필요"),
    WARNING("🤮", "거래 위험");

    private final String icon;
    private final String label;

    FreshnessGrade(String icon, String label) {
        this.icon = icon;
        this.label = label;
    }

    public static FreshnessGrade fromScore(double freshness) {
        if (freshness >= 90.0) {
            return CROWN;
        }
        if (freshness >= 70.0) {
            return SPARKLE;
        }
        if (freshness >= 50.0) {
            return SPROUT;
        }
        if (freshness >= 30.0) {
            return FALL_LEAF;
        }
        return WARNING;
    }

    public String getIcon() {
        return icon;
    }

    public String getLabel() {
        return label;
    }
}
