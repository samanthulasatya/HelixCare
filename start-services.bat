@echo off
echo Starting HelixCare Backend Microservices...

echo Starting Gateway-Service (Port 8080)...
start "Gateway-Service" cmd /c "cd backend/gateway-service && mvn spring-boot:run"

echo Starting Patient-Service (Port 8085)...
start "Patient-Service" cmd /c "cd backend/patient-service && mvn spring-boot:run"

echo Starting Doctor-Service (Port 8086)...
start "Doctor-Service" cmd /c "cd backend/doctor-service && mvn spring-boot:run"

echo Starting Appointment-Service (Port 8087)...
start "Appointment-Service" cmd /c "cd backend/appointment-service && mvn spring-boot:run"

echo Starting Billing-Service (Port 8088, gRPC 9090)...
start "Billing-Service" cmd /c "cd backend/billing-service && mvn spring-boot:run"

echo All microservices are launching. Check the new terminal windows for active logs!
pause
