package com.hjs.foodshare;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.hjs.foodshare.review.service.FreshnessCalculator;
import com.hjs.foodshare.user.domain.FreshnessGrade;
import org.junit.jupiter.api.Test;

class FreshnessGradeTests {

    @Test
    void mapsFreshnessScoreToEightGrades() {
        assertEquals(FreshnessGrade.LEGEND, FreshnessGrade.fromScore(95.0));
        assertEquals(FreshnessGrade.MODEL, FreshnessGrade.fromScore(85.0));
        assertEquals(FreshnessGrade.RELIABLE, FreshnessGrade.fromScore(70.0));
        assertEquals(FreshnessGrade.GROWING, FreshnessGrade.fromScore(55.0));
        assertEquals(FreshnessGrade.NORMAL, FreshnessGrade.fromScore(40.0));
        assertEquals(FreshnessGrade.CAUTION, FreshnessGrade.fromScore(30.0));
        assertEquals(FreshnessGrade.DANGER, FreshnessGrade.fromScore(20.0));
        assertEquals(FreshnessGrade.RESTRICTED, FreshnessGrade.fromScore(19.9));
    }

    @Test
    void keepsBaseUserInNormalGradeAfterSingleLowRating() {
        assertEquals(50.0, FreshnessCalculator.baseScore());
        assertEquals(43.0, FreshnessCalculator.update(50.0, 1));
        assertEquals(FreshnessGrade.NORMAL, FreshnessGrade.fromScore(43.0));
    }

    @Test
    void appliesAsymmetricFreshnessChanges() {
        assertEquals(52.0, FreshnessCalculator.update(50.0, 5));
        assertEquals(50.9, FreshnessCalculator.update(50.0, 4));
        assertEquals(50.0, FreshnessCalculator.update(50.0, 3));
        assertEquals(48.0, FreshnessCalculator.update(50.0, 2));
    }
}
