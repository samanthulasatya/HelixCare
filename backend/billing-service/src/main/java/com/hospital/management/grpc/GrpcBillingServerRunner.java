package com.hospital.management.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import jakarta.annotation.PreDestroy;

@Component
public class GrpcBillingServerRunner implements CommandLineRunner {

    @Autowired
    private GrpcBillingService grpcBillingService;

    private Server server;

    @Override
    public void run(String... args) throws Exception {
        server = ServerBuilder.forPort(9090)
                .addService(grpcBillingService)
                .build();

        System.out.println("Starting gRPC Billing Server on port 9090...");
        server.start();

        Thread monitorThread = new Thread(() -> {
            try {
                server.awaitTermination();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.err.println("gRPC Server monitoring thread interrupted.");
            }
        });
        monitorThread.setDaemon(true);
        monitorThread.start();
    }

    @PreDestroy
    public void stopServer() {
        if (server != null) {
            System.out.println("Shutting down gRPC Billing Server on port 9090...");
            server.shutdown();
        }
    }
}
