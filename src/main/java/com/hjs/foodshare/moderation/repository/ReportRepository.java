package com.hjs.foodshare.moderation.repository;

import com.hjs.foodshare.moderation.domain.Report;
import com.hjs.foodshare.moderation.domain.ReportTargetType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByReporterIdAndTargetTypeAndTargetId(Long reporterId, ReportTargetType targetType, Long targetId);

    List<Report> findAllByReporterIdOrderByCreatedAtDesc(Long reporterId);
}
