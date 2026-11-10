package com.hjs.foodshare.demo;

import jakarta.annotation.PreDestroy;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Separate, bounded worker; no network request is made under a database transaction. */
@Component
@ConditionalOnProperty(name="app.demo.worker-enabled", havingValue="true", matchIfMissing=true)
public class DemoGroupCompanionWorker {
    private static final Logger log = LoggerFactory.getLogger(DemoGroupCompanionWorker.class);
    private final DemoGroupCompanionService simulation;
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private final ExecutorService pool = new ThreadPoolExecutor(2, 2, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(80), runnable -> {
                Thread thread = new Thread(runnable, "demo-group-companion");
                thread.setDaemon(true);
                return thread;
            });

    public DemoGroupCompanionWorker(DemoGroupCompanionService simulation) {
        this.simulation = simulation;
    }

    @Scheduled(fixedDelay = 1500)
    public void tick() {
        try {
            for (Long id : simulation.due()) {
                if (!running.add(id)) continue;
                try {
                    pool.execute(() -> {
                        try {
                            DemoGroupCompanionService.Prompt prompt = simulation.prepare(id);
                            if (prompt != null) simulation.respond(prompt);
                        } catch (Exception exception) {
                            log.warn("Demo inbound job {} deferred: {}", id, exception.toString());
                            try { simulation.defer(id); } catch (Exception retryError) {
                                log.warn("Unable to defer demo job {}: {}", id, retryError.toString());
                            }
                        } finally {
                            running.remove(id);
                        }
                    });
                } catch (java.util.concurrent.RejectedExecutionException rejected) {
                    running.remove(id);
                    break;
                }
            }
        } catch (Exception exception) {
            log.warn("Unable to query pending demo inbound jobs: {}", exception.toString());
        }
    }

    @PreDestroy
    public void shutdown() { pool.shutdownNow(); }
}
