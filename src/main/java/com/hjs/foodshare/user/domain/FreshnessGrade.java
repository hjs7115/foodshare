package com.hjs.foodshare.user.domain;

public enum FreshnessGrade {
    LEGEND("👑", "전설 반띵러"),
    MODEL("💎", "모범 반띵러"),
    RELIABLE("✨", "든든한 반띵러"),
    GROWING("🌿", "성장 반띵러"),
    NORMAL("🌱", "일반 반띵러"),
    CAUTION("🍂", "주의 반띵러"),
    DANGER("⚠️", "위험 반띵러"),
    RESTRICTED("🤮", "제한 반띵러");

    private final String icon;
    private final String label;

    FreshnessGrade(String icon, String label) {
        this.icon = icon;
        this.label = label;
    }

    public static FreshnessGrade fromScore(double freshness) {
        if (freshness >= 95.0) {
            return LEGEND;
        }
        if (freshness >= 85.0) {
            return MODEL;
        }
        if (freshness >= 70.0) {
            return RELIABLE;
        }
        if (freshness >= 55.0) {
            return GROWING;
        }
        if (freshness >= 40.0) {
            return NORMAL;
        }
        if (freshness >= 30.0) {
            return CAUTION;
        }
        if (freshness >= 20.0) {
            return DANGER;
        }
        return RESTRICTED;
    }

    public String getIcon() {
        return icon;
    }

    public String getLabel() {
        return label;
    }
}
