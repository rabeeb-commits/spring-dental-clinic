import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dentalclinic.com' },
    update: {},
    create: {
      email: 'admin@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phone: '1234567890',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create dentist users
  const dentist1 = await prisma.user.upsert({
    where: { email: 'dr.smith@dentalclinic.com' },
    update: {},
    create: {
      email: 'dr.smith@dentalclinic.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'DENTIST',
      phone: '1234567891',
    },
  });
  console.log('✅ Created dentist:', dentist1.email);

  const dentist2 = await prisma.user.upsert({
    where: { email: 'dr.johnson@dentalclinic.com' },
    update: {},
    create: {
      email: 'dr.johnson@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'DENTIST',
      phone: '1234567892',
    },
  });
  console.log('✅ Created dentist:', dentist2.email);

  // Create receptionist
  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@dentalclinic.com' },
    update: {},
    create: {
      email: 'reception@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'RECEPTIONIST',
      phone: '1234567893',
    },
  });
  console.log('✅ Created receptionist:', receptionist.email);

  // Create predefined diseases
  const diseases = [
    { name: 'Dental Caries', code: 'K02', category: 'Tooth Decay', description: 'Tooth decay caused by bacteria' },
    { name: 'Gingivitis', code: 'K05.1', category: 'Gum Disease', description: 'Inflammation of the gums' },
    { name: 'Periodontitis', code: 'K05.3', category: 'Gum Disease', description: 'Serious gum infection that damages soft tissue' },
    { name: 'Pulpitis', code: 'K04.0', category: 'Pulp Disease', description: 'Inflammation of the dental pulp' },
    { name: 'Dental Abscess', code: 'K04.7', category: 'Infection', description: 'Pocket of pus caused by bacterial infection' },
    { name: 'Impacted Tooth', code: 'K01.1', category: 'Tooth Position', description: 'Tooth that fails to emerge properly' },
    { name: 'Tooth Fracture', code: 'S02.5', category: 'Trauma', description: 'Broken or cracked tooth' },
    { name: 'Dental Erosion', code: 'K03.2', category: 'Tooth Wear', description: 'Loss of tooth enamel due to acid' },
    { name: 'Bruxism', code: 'G47.63', category: 'Functional', description: 'Teeth grinding or clenching' },
    { name: 'TMJ Disorder', code: 'K07.6', category: 'Joint', description: 'Temporomandibular joint dysfunction' },
    { name: 'Oral Thrush', code: 'B37.0', category: 'Infection', description: 'Fungal infection of the mouth' },
    { name: 'Aphthous Ulcer', code: 'K12.0', category: 'Soft Tissue', description: 'Canker sores in the mouth' },
  ];

  for (const disease of diseases) {
    await prisma.disease.upsert({
      where: { name: disease.name },
      update: {},
      create: disease,
    });
  }
  console.log('✅ Created predefined diseases');

  // Create procedure types
  const procedures = [
    { name: 'Dental Examination', code: 'D0120', category: 'Diagnostic', defaultCost: 500, duration: 30 },
    { name: 'X-Ray (Periapical)', code: 'D0220', category: 'Diagnostic', defaultCost: 300, duration: 15 },
    { name: 'X-Ray (Panoramic)', code: 'D0330', category: 'Diagnostic', defaultCost: 800, duration: 20 },
    { name: 'Teeth Cleaning (Scaling)', code: 'D1110', category: 'Preventive', defaultCost: 1500, duration: 45 },
    { name: 'Fluoride Treatment', code: 'D1206', category: 'Preventive', defaultCost: 500, duration: 15 },
    { name: 'Dental Sealant', code: 'D1351', category: 'Preventive', defaultCost: 800, duration: 20 },
    { name: 'Composite Filling', code: 'D2391', category: 'Restorative', defaultCost: 1500, duration: 45 },
    { name: 'Amalgam Filling', code: 'D2140', category: 'Restorative', defaultCost: 1200, duration: 45 },
    { name: 'Root Canal Treatment', code: 'D3310', category: 'Endodontics', defaultCost: 8000, duration: 90 },
    { name: 'Tooth Extraction (Simple)', code: 'D7140', category: 'Oral Surgery', defaultCost: 1500, duration: 30 },
    { name: 'Tooth Extraction (Surgical)', code: 'D7210', category: 'Oral Surgery', defaultCost: 3500, duration: 60 },
    { name: 'Wisdom Tooth Removal', code: 'D7240', category: 'Oral Surgery', defaultCost: 5000, duration: 60 },
    { name: 'Dental Crown (PFM)', code: 'D2750', category: 'Prosthodontics', defaultCost: 8000, duration: 60 },
    { name: 'Dental Crown (Zirconia)', code: 'D2740', category: 'Prosthodontics', defaultCost: 12000, duration: 60 },
    { name: 'Dental Bridge', code: 'D6240', category: 'Prosthodontics', defaultCost: 25000, duration: 90 },
    { name: 'Complete Denture', code: 'D5110', category: 'Prosthodontics', defaultCost: 20000, duration: 120 },
    { name: 'Partial Denture', code: 'D5211', category: 'Prosthodontics', defaultCost: 15000, duration: 90 },
    { name: 'Dental Implant', code: 'D6010', category: 'Implantology', defaultCost: 35000, duration: 120 },
    { name: 'Teeth Whitening', code: 'D9972', category: 'Cosmetic', defaultCost: 8000, duration: 60 },
    { name: 'Dental Veneer', code: 'D2962', category: 'Cosmetic', defaultCost: 15000, duration: 60 },
    { name: 'Gum Surgery', code: 'D4240', category: 'Periodontics', defaultCost: 10000, duration: 90 },
    { name: 'Deep Cleaning (Root Planing)', code: 'D4341', category: 'Periodontics', defaultCost: 3000, duration: 60 },
    { name: 'Orthodontic Consultation', code: 'D8660', category: 'Orthodontics', defaultCost: 1000, duration: 45 },
    { name: 'Braces (Metal)', code: 'D8080', category: 'Orthodontics', defaultCost: 50000, duration: 60 },
    { name: 'Clear Aligners', code: 'D8040', category: 'Orthodontics', defaultCost: 80000, duration: 60 },
  ];

  for (const procedure of procedures) {
    await prisma.procedureType.upsert({
      where: { name: procedure.name },
      update: {},
      create: procedure,
    });
  }
  console.log('✅ Created procedure types');

  // Create sample patients
  const patient1 = await prisma.patient.upsert({
    where: { patientId: 'PAT-2024-0001' },
    update: {},
    create: {
      patientId: 'PAT-2024-0001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'MALE',
      phone: '9876543210',
      email: 'rahul.sharma@email.com',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      bloodGroup: 'O+',
      medicalHistory: {
        create: {
          allergies: ['Penicillin'],
          chronicDiseases: ['Diabetes'],
          currentMedications: ['Metformin 500mg'],
        },
      },
    },
  });
  console.log('✅ Created sample patient:', patient1.patientId);

  const patient2 = await prisma.patient.upsert({
    where: { patientId: 'PAT-2024-0002' },
    update: {},
    create: {
      patientId: 'PAT-2024-0002',
      firstName: 'Priya',
      lastName: 'Patel',
      dateOfBirth: new Date('1985-08-22'),
      gender: 'FEMALE',
      phone: '9876543211',
      email: 'priya.patel@email.com',
      address: '456 Park Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400002',
      bloodGroup: 'A+',
      medicalHistory: {
        create: {
          allergies: [],
          chronicDiseases: [],
          currentMedications: [],
        },
      },
    },
  });
  console.log('✅ Created sample patient:', patient2.patientId);

  // Create default invoice template
  const existingDefault = await prisma.invoiceTemplate.findFirst({
    where: { isDefault: true },
  });

  if (!existingDefault) {
    const defaultTemplate = await prisma.invoiceTemplate.create({
      data: {
      name: 'Default',
      isDefault: true,
      logoPosition: 'left',
      showClinicName: true,
      showAddress: true,
      showContact: true,
      templateStyle: 'classic',
      itemTableStyle: 'bordered',
      totalsPosition: 'right',
      showDueDate: true,
      showPaymentMethods: true,
      lateFeeEnabled: false,
      lateFeePercent: 0,
      lateFeeDays: 30,
      taxLabel: 'Tax',
      taxType: 'percentage',
      showTaxBreakdown: false,
      showSignature: false,
      signatureLabel: 'Authorized Signature',
      primaryColor: '#0891b2',
        fontFamily: 'Arial, sans-serif',
      },
    });
    console.log('✅ Created default invoice template');
  } else {
    console.log('✅ Default invoice template already exists');
  }

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin: admin@dentalclinic.com / admin123');
  console.log('   Dentist: dr.smith@dentalclinic.com / admin123');
  console.log('   Receptionist: reception@dentalclinic.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



