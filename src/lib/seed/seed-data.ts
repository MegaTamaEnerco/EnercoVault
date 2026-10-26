import { connectDB } from '@/lib/db';
import { Role } from '@/models/Role';
import { User } from '@/models/User';
import { Department } from '@/models/Department';
import { ComplianceFramework, ComplianceCategory } from '@/models/ComplianceFramework';
import { Taxonomy, CustomFieldType } from '@/models/Taxonomy';
import { DocumentModel } from '@/models/Document';
import { ChangeRequest } from '@/models/ChangeRequest';
import { generateDocumentPdf } from '@/lib/pdf-stamper';
import { saveFileToStorage } from '@/lib/storage-engine';
import { DEFAULT_ROLES } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';

export async function runDatabaseSeed() {
  await connectDB();
  console.log('[Seed] Connected to MongoDB. Seeding initial system data...');

  // 1. Seed Roles
  const seededRoles = new Map<string, any>();
  for (const roleDef of DEFAULT_ROLES) {
    const roleDoc = await Role.findOneAndUpdate(
      { code: roleDef.code },
      { $setOnInsert: roleDef },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    seededRoles.set(roleDef.code, roleDoc);
  }

  // 2. Seed Departments
  const defaultDepts = [
    { code: 'CSL', name: 'Corporate Secretary & Legal', description: 'Tata kelola korporat & legalitas' },
    { code: 'QHSE', name: 'QHSE & Compliance', description: 'Mutu, Lingkungan, K3 dan Audit' },
    { code: 'OPS', name: 'Engineering & Operations', description: 'Operasional proyek & pemeliharaan' },
    { code: 'FIN', name: 'Finance & Administration', description: 'Keuangan & administrasi umum' },
  ];

  const seededDepts = new Map<string, any>();
  for (const dept of defaultDepts) {
    const deptDoc = await Department.findOneAndUpdate(
      { code: dept.code },
      { $set: dept },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    seededDepts.set(dept.code, deptDoc);
  }

  // 3. Seed Super Admin User
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@enerco.co.id';
  const superAdminRole = seededRoles.get('SUPER_ADMIN');
  const cslDept = seededDepts.get('CSL');

  const existingSuperAdmin = await User.findOne({
    $or: [{ email: superAdminEmail }, { username: 'superadmin' }],
  });

  if (!existingSuperAdmin && superAdminRole) {
    const defaultPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'SuperAdmin2026!';
    const passwordHash = await hashPassword(defaultPassword);

    await User.create({
      username: 'superadmin',
      email: superAdminEmail,
      fullName: 'Chief System Administrator',
      passwordHash,
      roleIds: [superAdminRole._id],
      departmentId: cslDept?._id,
      isActive: true,
      twoFactor: { enabled: false },
      security: { failedAttempts: 0, sessionVersion: 1 },
    });
    console.log(`[Seed] Created default Super Admin user: ${superAdminEmail} / superadmin`);
  }

  // 4. Seed Compliance Frameworks (Annex SL & SMK3)
  const frameworksData: {
    code: string;
    name: string;
    category: ComplianceCategory;
    version: string;
    badgeColor: string;
    clauses: any[];
  }[] = [
    {
      code: 'ISO-9001-2015',
      name: 'ISO 9001:2015 - Sistem Manajemen Mutu (QMS)',
      category: 'QUALITY',
      version: '2015',
      badgeColor: '#2563eb',
      clauses: [
        { clauseNumber: '4.1', parentClause: '4', title: 'Konteks Organisasi', hlsGroup: 'CONTEXT_OF_ORGANIZATION', mandatoryDocumentHint: 'Matriks Isu Internal & Eksternal' },
        { clauseNumber: '5.2', parentClause: '5', title: 'Kebijakan Mutu', hlsGroup: 'LEADERSHIP', mandatoryDocumentHint: 'Pernyataan Kebijakan Terintegrasi QHSE' },
        { clauseNumber: '6.1', parentClause: '6', title: 'Tindakan Menangani Risiko dan Peluang', hlsGroup: 'PLANNING', mandatoryDocumentHint: 'Risk Assessment Register' },
        { clauseNumber: '7.5', parentClause: '7', title: 'Informasi Terdokumentasi', hlsGroup: 'SUPPORT', mandatoryDocumentHint: 'SOP Pengendalian Dokumen & Rekaman' },
        { clauseNumber: '8.5.1', parentClause: '8', title: 'Pengendalian Operasional Mutu', hlsGroup: 'OPERATION', mandatoryDocumentHint: 'ITP & Inspection Checklist' },
        { clauseNumber: '9.2', parentClause: '9', title: 'Audit Internal', hlsGroup: 'PERFORMANCE_EVALUATION', mandatoryDocumentHint: 'Jadwal & Laporan Audit Internal' },
        { clauseNumber: '10.2', parentClause: '10', title: 'Ketidaksesuaian & Tindakan Korektif', hlsGroup: 'IMPROVEMENT', mandatoryDocumentHint: 'Form NCR & CAR' },
      ],
    },
    {
      code: 'ISO-14001-2015',
      name: 'ISO 14001:2015 - Sistem Manajemen Lingkungan (EMS)',
      category: 'ENVIRONMENT',
      version: '2015',
      badgeColor: '#16a34a',
      clauses: [
        { clauseNumber: '4.1', parentClause: '4', title: 'Konteks Organisasi & Lingkungan', hlsGroup: 'CONTEXT_OF_ORGANIZATION' },
        { clauseNumber: '6.1.2', parentClause: '6', title: 'Aspek Lingkungan Penting (EAI)', hlsGroup: 'PLANNING', mandatoryDocumentHint: 'Register Aspek & Dampak Lingkungan' },
        { clauseNumber: '7.5', parentClause: '7', title: 'Informasi Terdokumentasi Lingkungan', hlsGroup: 'SUPPORT' },
        { clauseNumber: '8.1', parentClause: '8', title: 'Pengendalian Operasional Lingkungan & Limbah B3', hlsGroup: 'OPERATION', mandatoryDocumentHint: 'SOP Pengelolaan TPS B3' },
        { clauseNumber: '8.2', parentClause: '8', title: 'Kesiapsiagaan & Tanggap Darurat Lingkungan', hlsGroup: 'OPERATION', mandatoryDocumentHint: 'Prosedur Tanggap Tumpahan Kimia' },
        { clauseNumber: '9.2', parentClause: '9', title: 'Audit Internal Lingkungan', hlsGroup: 'PERFORMANCE_EVALUATION' },
        { clauseNumber: '10.2', parentClause: '10', title: 'Insiden & Tindakan Korektif Lingkungan', hlsGroup: 'IMPROVEMENT' },
      ],
    },
    {
      code: 'ISO-45001-2018',
      name: 'ISO 45001:2018 - Sistem Manajemen K3 (OHSMS)',
      category: 'OHS',
      version: '2018',
      badgeColor: '#ea580c',
      clauses: [
        { clauseNumber: '4.1', parentClause: '4', title: 'Konteks Organisasi K3', hlsGroup: 'CONTEXT_OF_ORGANIZATION' },
        { clauseNumber: '6.1.2', parentClause: '6', title: 'Identifikasi Bahaya & Penilaian Risiko (HIRADC)', hlsGroup: 'PLANNING', mandatoryDocumentHint: 'Matriks HIRADC / IBPRP' },
        { clauseNumber: '7.5', parentClause: '7', title: 'Informasi Terdokumentasi K3', hlsGroup: 'SUPPORT' },
        { clauseNumber: '8.1.2', parentClause: '8', title: 'Hierarki Pengendalian Bahaya K3', hlsGroup: 'OPERATION', mandatoryDocumentHint: 'SOP Izin Kerja Khusus (PTW)' },
        { clauseNumber: '8.2', parentClause: '8', title: 'Kesiapsiagaan dan Tanggap Darurat K3', hlsGroup: 'OPERATION', mandatoryDocumentHint: 'ERP & Simulasi Evakuasi Darurat' },
        { clauseNumber: '9.2', parentClause: '9', title: 'Audit Internal K3', hlsGroup: 'PERFORMANCE_EVALUATION' },
        { clauseNumber: '10.2', parentClause: '10', title: 'Penyelidikan Insiden & Ketidaksesuaian', hlsGroup: 'IMPROVEMENT', mandatoryDocumentHint: 'Laporan Investigasi Kecelakaan Kerja' },
      ],
    },
    {
      code: 'SMK3-PP50',
      name: 'SMK3 PP No. 50/2012 (Regulasi K3 Nasional)',
      category: 'LEGAL',
      version: '2012',
      badgeColor: '#dc2626',
      clauses: [
        { clauseNumber: '1.1', parentClause: '1', title: 'Kebijakan K3 Tertulis & Ditandatangani Pengurus' },
        { clauseNumber: '2.1', parentClause: '2', title: 'Rencana K3 Berdasarkan Identifikasi Bahaya' },
        { clauseNumber: '3.1', parentClause: '3', title: 'Penetapan Prosedur Kerja & Instruksi Kerja K3' },
        { clauseNumber: '4.1', parentClause: '4', title: 'Pengendalian Dokumen K3 PP 50/2012' },
        { clauseNumber: '6.1', parentClause: '6', title: 'Izin Kerja Berbahaya (Hot Work, WAH, Confined Space)' },
        { clauseNumber: '9.1', parentClause: '9', title: 'Pengelolaan Bahan Berbahaya & Beracun (B3 / MSDS)' },
        { clauseNumber: '11.1', parentClause: '11', title: 'Audit Internal SMK3 (64/122/166 Kriteria)' },
      ],
    },
  ];

  for (const fw of frameworksData) {
    await ComplianceFramework.findOneAndUpdate(
      { code: fw.code },
      { $set: fw },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  // 5. Seed Initial Taxonomies
  const taxonomiesData: any[] = [
    {
      name: 'Dokumen Legalitas & Perizinan',
      slug: 'legalitas-perizinan',
      codePrefix: 'LEG',
      icon: 'ShieldCheck',
      colorTheme: '#8b5cf6',
      retentionConfig: { hasExpiry: true, defaultReviewMonths: 12, alertDaysBeforeExpiry: [60, 30, 14], isMandatoryForCompliance: true },
      customFieldsSchema: [
        { fieldKey: 'instansiPenerbit', label: 'Instansi Penerbit', fieldType: 'TEXT', isRequired: true, isFilterable: true },
        { fieldKey: 'nomorAkta_SK', label: 'Nomor Surat Keputusan / Akta', fieldType: 'TEXT', isRequired: true, isFilterable: true },
        { fieldKey: 'jenisPerizinan', label: 'Jenis Perizinan', fieldType: 'SELECT', options: ['NIB OSS', 'SBUJK Konstruksi', 'AMDAL/UKL-UPL', 'SIA Alat', 'SILO'], isRequired: true, isFilterable: true },
      ],
      defaultWorkflowTemplate: [
        { step: 1, role: 'CORPORATE_SECRETARY', permission: 'dcr:review_doccontrol', action: 'Verifikasi Legalitas & Masa Berlaku' },
        { step: 2, role: 'PRESIDENT_DIRECTOR', permission: 'dcr:approve_final', action: 'Pengesahan Pucuk Pimpinan' },
      ],
    },
    {
      name: 'SOP & Instruksi Kerja Terintegrasi (IMS)',
      slug: 'sop-instruksi-kerja',
      codePrefix: 'SOP',
      icon: 'BookOpen',
      colorTheme: '#2563eb',
      retentionConfig: { hasExpiry: false, defaultReviewMonths: 12, alertDaysBeforeExpiry: [30], isMandatoryForCompliance: true },
      customFieldsSchema: [
        { fieldKey: 'prosesBisnis', label: 'Proses Bisnis Utama', fieldType: 'TEXT', isRequired: true, isFilterable: true },
        { fieldKey: 'alatKerjaTerkait', label: 'Peralatan Terkait', fieldType: 'TEXT', isRequired: false, isFilterable: false },
        { fieldKey: 'outputRekaman', label: 'Formulir / Rekaman yang Dihasilkan', fieldType: 'TEXT', isRequired: true, isFilterable: true },
      ],
      defaultWorkflowTemplate: [
        { step: 1, role: 'QHSE_MANAGER', permission: 'dcr:review_technical', action: 'Kajian Teknis Standar Mutu, Lingkungan & K3' },
        { step: 2, role: 'CORPORATE_SECRETARY', permission: 'dcr:review_doccontrol', action: 'Registrasi Masterlist & Format Tata Naskah' },
        { step: 3, role: 'PRESIDENT_DIRECTOR', permission: 'dcr:approve_final', action: 'Pengesahan Direksi' },
      ],
    },
    {
      name: 'HIRADC / IBPRP & JSA',
      slug: 'hiradc-jsa',
      codePrefix: 'HSE-RA',
      icon: 'AlertTriangle',
      colorTheme: '#ea580c',
      retentionConfig: { hasExpiry: true, defaultReviewMonths: 12, alertDaysBeforeExpiry: [30], isMandatoryForCompliance: true },
      customFieldsSchema: [
        { fieldKey: 'tingkatRisikoAwal', label: 'Tingkat Risiko Awal', fieldType: 'SELECT', options: ['Low', 'Medium', 'High', 'Extreme'], isRequired: true, isFilterable: true },
        { fieldKey: 'hierarkiPengendalian', label: 'Hierarki Pengendalian', fieldType: 'SELECT', options: ['Eliminasi', 'Substitusi', 'Rekayasa Teknis', 'Pengendalian Administratif', 'APD'], isRequired: true, isFilterable: true },
        { fieldKey: 'tingkatRisikoSisa', label: 'Tingkat Risiko Sisa (Residual)', fieldType: 'SELECT', options: ['Low', 'Medium'], isRequired: true, isFilterable: true },
      ],
      defaultWorkflowTemplate: [
        { step: 1, role: 'QHSE_MANAGER', permission: 'dcr:review_technical', action: 'Verifikasi Kajian Risiko K3' },
        { step: 2, role: 'PRESIDENT_DIRECTOR', permission: 'dcr:approve_final', action: 'Approval Manajemen' },
      ],
    },
    {
      name: 'Aspek & Dampak Lingkungan (EAI / AMDAL)',
      slug: 'aspek-dampak-lingkungan',
      codePrefix: 'ENV-EAI',
      icon: 'Leaf',
      colorTheme: '#16a34a',
      retentionConfig: { hasExpiry: true, defaultReviewMonths: 12, alertDaysBeforeExpiry: [30], isMandatoryForCompliance: true },
      customFieldsSchema: [
        { fieldKey: 'environmentalImpact', label: 'Kategori Dampak', fieldType: 'MULTI_SELECT', options: ['Limbah B3', 'Limbah Domestik', 'Emisi Udara', 'Pencemaran Air', 'Kebisingan', 'Konsumsi Energi'], isRequired: true, isFilterable: true },
        { fieldKey: 'operationalCondition', label: 'Kondisi Operasional', fieldType: 'SELECT', options: ['Normal', 'Abnormal', 'Darurat (Emergency)'], isRequired: true, isFilterable: true },
      ],
      defaultWorkflowTemplate: [
        { step: 1, role: 'QHSE_MANAGER', permission: 'dcr:review_technical', action: 'Verifikasi Teknis Lingkungan' },
        { step: 2, role: 'PRESIDENT_DIRECTOR', permission: 'dcr:approve_final', action: 'Pengesahan Akhir' },
      ],
    },
  ];

  for (const tax of taxonomiesData) {
    await Taxonomy.findOneAndUpdate(
      { slug: tax.slug },
      { $set: tax },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  // 6. Seed Sample Documents with real physical PDFs
  const existingDocsCount = await DocumentModel.countDocuments();
  const adminUser = await User.findOne({ username: 'superadmin' });
  if (existingDocsCount === 0 && adminUser) {
    const legalTax = await Taxonomy.findOne({ slug: 'legalitas-perizinan' });
    const sopTax = await Taxonomy.findOne({ slug: 'sop-instruksi-kerja' });
    const hseRaTax = await Taxonomy.findOne({ slug: 'hiradc-jsa' });
    const envTax = await Taxonomy.findOne({ slug: 'aspek-dampak-lingkungan' });

    const sampleDocs = [
      {
        docNumber: 'MTE-LEG-NIB-001',
        title: 'NIB (Nomor Induk Berusaha) & Izin Usaha Korporat',
        taxonomyId: legalTax?._id,
        taxonomySnapshot: { name: legalTax?.name || 'Legalitas', codePrefix: 'LEG', colorTheme: '#8b5cf6' },
        departmentId: cslDept?._id,
        ownerId: adminUser._id,
        accessLevel: 'INTERNAL' as const,
        status: 'ACTIVE' as const,
        currentVersion: 1,
        effectiveDate: new Date('2026-01-15'),
        nextReviewDate: new Date('2027-01-15'),
        complianceMappings: [
          { frameworkCode: 'ISO-9001-2015', clauses: ['4.1'] },
          { frameworkCode: 'SMK3-PP50', clauses: ['1.1'] },
        ],
        customAttributes: {
          instansiPenerbit: 'Kementerian Investasi / BKPM RI',
          nomorAkta_SK: 'NIB-912000492812',
          jenisPerizinan: 'NIB OSS',
        },
      },
      {
        docNumber: 'MTE-IMS-SOP-001',
        title: 'Prosedur Pengendalian Informasi Terdokumentasi & Rekaman',
        taxonomyId: sopTax?._id,
        taxonomySnapshot: { name: sopTax?.name || 'SOP Terintegrasi', codePrefix: 'SOP', colorTheme: '#2563eb' },
        departmentId: cslDept?._id,
        ownerId: adminUser._id,
        accessLevel: 'INTERNAL' as const,
        status: 'ACTIVE' as const,
        currentVersion: 2,
        effectiveDate: new Date('2026-02-01'),
        nextReviewDate: new Date('2027-02-01'),
        complianceMappings: [
          { frameworkCode: 'ISO-9001-2015', clauses: ['7.5.1', '7.5.2', '7.5.3'] },
          { frameworkCode: 'ISO-14001-2015', clauses: ['7.5.1', '7.5.2', '7.5.3'] },
          { frameworkCode: 'ISO-45001-2018', clauses: ['7.5.1', '7.5.2', '7.5.3'] },
          { frameworkCode: 'SMK3-PP50', clauses: ['4.1.1', '4.1.2'] },
        ],
        customAttributes: {
          prosesBisnis: 'Document Control & Administrasi Korporat',
          outputRekaman: 'Daftar Induk Dokumen (Masterlist) & Form DCR',
        },
      },
      {
        docNumber: 'MTE-HSE-RA-012',
        title: 'Identifikasi Bahaya, Penilaian Risiko & HIRADC Proyek Konstruksi',
        taxonomyId: hseRaTax?._id,
        taxonomySnapshot: { name: hseRaTax?.name || 'HIRADC & JSA', codePrefix: 'HSE-RA', colorTheme: '#ea580c' },
        departmentId: seededDepts.get('QHSE')?._id,
        ownerId: adminUser._id,
        accessLevel: 'INTERNAL' as const,
        status: 'ACTIVE' as const,
        currentVersion: 1,
        effectiveDate: new Date('2026-03-01'),
        nextReviewDate: new Date('2027-03-01'),
        complianceMappings: [
          { frameworkCode: 'ISO-45001-2018', clauses: ['6.1.2', '8.1.2'] },
          { frameworkCode: 'SMK3-PP50', clauses: ['2.1', '6.1'] },
        ],
        customAttributes: {
          tingkatRisikoAwal: 'High',
          hierarkiPengendalian: 'Rekayasa Teknis',
          tingkatRisikoSisa: 'Low',
        },
      },
      {
        docNumber: 'MTE-ENV-EAI-005',
        title: 'Aspek & Dampak Lingkungan (EAI) Serta Pengendalian Limbah B3',
        taxonomyId: envTax?._id,
        taxonomySnapshot: { name: envTax?.name || 'Lingkungan & B3', codePrefix: 'ENV-EAI', colorTheme: '#16a34a' },
        departmentId: seededDepts.get('QHSE')?._id,
        ownerId: adminUser._id,
        accessLevel: 'RESTRICTED' as const,
        status: 'ACTIVE' as const,
        currentVersion: 1,
        effectiveDate: new Date('2026-03-15'),
        nextReviewDate: new Date('2027-03-15'),
        complianceMappings: [
          { frameworkCode: 'ISO-14001-2015', clauses: ['6.1.2', '8.1', '8.2'] },
        ],
        customAttributes: {
          environmentalImpact: ['Limbah B3', 'Emisi Udara'],
          operationalCondition: 'Normal',
        },
      },
    ];

    for (const doc of sampleDocs) {
      if (!doc.taxonomyId) continue;

      // Generate actual official PDF buffer
      const pdfBuffer = await generateDocumentPdf({
        title: doc.title,
        docNumber: doc.docNumber,
        revision: doc.currentVersion,
        categoryName: doc.taxonomySnapshot.name,
        clauses: doc.complianceMappings.map((m) => `${m.frameworkCode}: ${m.clauses.join(', ')}`),
      });

      // Save to physical storage engine
      const stored = await saveFileToStorage(pdfBuffer, `${doc.docNumber}.pdf`, doc.docNumber);

      await DocumentModel.create({
        ...doc,
        currentFile: {
          versionId: undefined,
          versionNumber: doc.currentVersion,
          storagePath: stored.storagePath,
          fileName: stored.fileName,
          fileSize: stored.fileSize,
          mimeType: stored.mimeType,
          sha256Hash: stored.sha256Hash,
          qrVerificationToken: stored.qrVerificationToken,
          uploadedBy: adminUser._id,
          uploadedAt: new Date(),
          changeSummary: 'Terbitan awal dokumen sah sistem Enerco Vault',
        },
        revisionHistory: [],
      });
      console.log(`[Seed] Created document: ${doc.docNumber}`);
    }
  }

  // 7. Seed Initial Sample DCRs
  const existingDcrsCount = await ChangeRequest.countDocuments();
  if (existingDcrsCount === 0 && adminUser) {
    const targetDoc1 = await DocumentModel.findOne({ docNumber: 'MTE-IMS-SOP-001' });
    const targetDoc2 = await DocumentModel.findOne({ docNumber: 'MTE-ENV-EAI-005' });
    const sopTax = await Taxonomy.findOne({ slug: 'sop-instruksi-kerja' });
    const envTax = await Taxonomy.findOne({ slug: 'aspek-dampak-lingkungan' });

    const standardWorkflow = [
      { step: 1, role: 'QHSE_MANAGER', permission: 'dcr:review_technical', action: 'Kajian Teknis Standar Mutu, Lingkungan & K3 (Annex SL)' },
      { step: 2, role: 'CORPORATE_SECRETARY', permission: 'dcr:review_doccontrol', action: 'Registrasi Masterlist & Format Tata Naskah Dokumen' },
      { step: 3, role: 'PRESIDENT_DIRECTOR', permission: 'dcr:approve_final', action: 'Pengesahan Pucuk Pimpinan / Direksi' },
    ];

    const sampleDcrs = [
      {
        dcrNumber: 'DCR-2026-001',
        title: 'Usulan Revisi Klausul 7.5 Pengendalian Rekaman & Masterlist Dokumen',
        type: 'REVISION' as const,
        status: 'IN_REVIEW' as const,
        targetDocumentId: targetDoc1?._id,
        proposedTaxonomyId: sopTax?._id,
        departmentId: cslDept?._id,
        initiatorId: adminUser._id,
        reasonForChange: 'Sinkronisasi klausul dokumentasi ISO 9001/14001/45001 dengan audit trail terenkripsi SHA-256.',
        currentStep: 1,
        totalSteps: 3,
        workflow: standardWorkflow,
        history: [
          {
            step: 0,
            role: 'SUPER_ADMIN',
            action: 'Pengajuan usulan DCR',
            reviewerId: adminUser._id,
            status: 'APPROVED' as const,
            comment: 'DCR diajukan untuk tinjauan berkala tahun 2026',
            decidedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        dcrNumber: 'DCR-2026-002',
        title: 'Penyesuaian Prosedur Pengelolaan Limbah B3 Sesuai Audit Proper Lingkungan',
        type: 'REVISION' as const,
        status: 'IN_REVIEW' as const,
        targetDocumentId: targetDoc2?._id,
        proposedTaxonomyId: envTax?._id,
        departmentId: seededDepts.get('QHSE')?._id,
        initiatorId: adminUser._id,
        reasonForChange: 'Pembaruan kode manifest limbah B3 dan titik penaatan TPS B3 Proyek Jawa.',
        currentStep: 2,
        totalSteps: 3,
        workflow: standardWorkflow,
        history: [
          {
            step: 0,
            role: 'SUPER_ADMIN',
            action: 'Pengajuan usulan DCR',
            reviewerId: adminUser._id,
            status: 'APPROVED' as const,
            comment: 'Pengajuan DCR diajukan oleh Tim QHSE',
            decidedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            step: 1,
            role: 'QHSE_MANAGER',
            action: 'Kajian Teknis Standar Mutu, Lingkungan & K3 (Annex SL)',
            reviewerId: adminUser._id,
            status: 'APPROVED' as const,
            comment: 'Kajian dampak lingkungan dan kepatuhan baku mutu telah sesuai regulasi KLHK.',
            decidedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ];

    for (const dcr of sampleDcrs) {
      if (dcr.proposedTaxonomyId) {
        await ChangeRequest.create(dcr);
        console.log(`[Seed] Created DCR: ${dcr.dcrNumber}`);
      }
    }
  }

  console.log('[Seed] Database initialization completed successfully.');
}

export const seedDatabase = runDatabaseSeed;
