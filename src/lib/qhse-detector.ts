/**
 * Helper to identify if a document belongs to SMK3 PP No. 50/2012 or QHSE/K3 domain.
 */
export function isSmk3OrQhseDocument(doc: {
  title?: string;
  docNumber?: string;
  complianceMappings?: Array<{ frameworkCode?: string; clauses?: string[] }>;
  department?: string;
  departmentId?: any;
  taxonomyId?: any;
  categoryName?: string;
  clauses?: string[];
}): boolean {
  if (!doc) return false;

  // 0. Check Direct Clauses array
  if (doc.clauses && Array.isArray(doc.clauses)) {
    const hasSmk3Clause = doc.clauses.some((c) => {
      const u = c.toUpperCase();
      return u.includes('SMK3') || u.includes('PP 50') || u.includes('PP50') || u.includes('45001');
    });
    if (hasSmk3Clause) return true;
  }

  // 1. Check Compliance Framework Mappings (SMK3-PP50 or ISO 45001)
  if (doc.complianceMappings && Array.isArray(doc.complianceMappings)) {
    const hasSmk3 = doc.complianceMappings.some((m) => {
      const code = (m.frameworkCode || '').toUpperCase();
      return (
        code.includes('SMK3') ||
        code.includes('PP50') ||
        code.includes('45001') ||
        code.includes('14001')
      );
    });
    if (hasSmk3) return true;
  }

  // 2. Check Department / Unit Kerja (HSE, QHSE, K3, EHS)
  const deptName = (
    typeof doc.department === 'string'
      ? doc.department
      : (doc.departmentId?.name || doc.departmentId?.code || '')
  ).toUpperCase();
  if (
    deptName.includes('HSE') ||
    deptName.includes('QHSE') ||
    deptName.includes('K3') ||
    deptName.includes('EHS') ||
    deptName.includes('KESELAMATAN')
  ) {
    return true;
  }

  // 3. Check Taxonomy / Category
  const catName = (
    doc.categoryName ||
    (doc.taxonomyId?.name || '')
  ).toUpperCase();
  if (
    catName.includes('K3') ||
    catName.includes('HSE') ||
    catName.includes('QHSE') ||
    catName.includes('SMK3') ||
    catName.includes('KESELAMATAN') ||
    catName.includes('LINGKUNGAN')
  ) {
    return true;
  }

  // 4. Check Title / Doc Number keywords
  const title = (doc.title || '').toUpperCase();
  const docNumber = (doc.docNumber || '').toUpperCase();
  const keywords = ['K3', 'HSE', 'SMK3', 'HIRADC', 'IBPRP', 'JSA', 'APD', 'TANGGAP DARURAT', 'KESELAMATAN', 'KECELAKAAN'];
  for (const kw of keywords) {
    if (title.includes(kw) || docNumber.includes(kw)) {
      return true;
    }
  }

  return false;
}
