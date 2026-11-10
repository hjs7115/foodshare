package com.hjs.foodshare.demo;
import java.util.Set;
import java.util.concurrent.*;
import jakarta.annotation.PreDestroy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
@Component
@ConditionalOnProperty(name="app.demo.worker-enabled",havingValue="true",matchIfMissing=true)
public class DemoSimulationWorker {
 private final DemoSimulationService simulation;
 private final Set<Long> running=ConcurrentHashMap.newKeySet();
 private final ExecutorService pool=new ThreadPoolExecutor(2,2,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(100),r->{Thread t=new Thread(r,"demo-simulation");t.setDaemon(true);return t;});
 public DemoSimulationWorker(DemoSimulationService simulation){this.simulation=simulation;}
 @Scheduled(fixedDelay=1000) public void tick(){
  for(Long id:simulation.due())if(running.add(id)){
   try{var prompt=simulation.prepareNext(id);if(prompt==null){running.remove(id);continue;}pool.execute(()->{try{simulation.respond(prompt);}catch(Exception e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Demo simulation {} deferred ({})",id,e.getClass().getSimpleName());}finally{running.remove(id);}});}catch(Exception e){running.remove(id);org.slf4j.LoggerFactory.getLogger(getClass()).warn("Demo preparation {} deferred ({})",id,e.getClass().getSimpleName());}
  }
 }
 @PreDestroy public void close(){pool.shutdownNow();}
}
