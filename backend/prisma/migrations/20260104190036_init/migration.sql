-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'PROCEDURE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ToothStatus" AS ENUM ('HEALTHY', 'CARIES', 'MISSING', 'RESTORED', 'CROWNED', 'ROOT_CANAL', 'EXTRACTED', 'IMPACTED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'ONLINE_WALLET', 'INSURANCE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('XRAY', 'SCAN', 'PRESCRIPTION', 'CONSENT_FORM', 'LAB_REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'RECEPTIONIST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "bloodGroup" TEXT,
    "profileImage" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentMedications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previousSurgeries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "familyHistory" TEXT,
    "smokingStatus" TEXT,
    "alcoholConsumption" TEXT,
    "pregnancyStatus" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dental_charts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chartData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dental_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diseases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diseases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "severity" TEXT,
    "notes" TEXT,
    "diagnosedById" TEXT NOT NULL,
    "diagnosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "defaultCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_procedures" (
    "id" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "procedureTypeId" TEXT NOT NULL,
    "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" "TreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionId" TEXT,
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientId_key" ON "patients"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_patientId_key" ON "medical_histories"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "diseases_name_key" ON "diseases"("name");

-- CreateIndex
CREATE UNIQUE INDEX "diseases_code_key" ON "diseases"("code");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_types_name_key" ON "procedure_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_types_code_key" ON "procedure_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_treatmentId_key" ON "invoices"("treatmentId");

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dental_charts" ADD CONSTRAINT "dental_charts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dental_charts" ADD CONSTRAINT "dental_charts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "diseases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_diagnosedById_fkey" FOREIGN KEY ("diagnosedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_procedures" ADD CONSTRAINT "treatment_procedures_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_procedures" ADD CONSTRAINT "treatment_procedures_procedureTypeId_fkey" FOREIGN KEY ("procedureTypeId") REFERENCES "procedure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
