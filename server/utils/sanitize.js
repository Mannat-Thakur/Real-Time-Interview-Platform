function sanitizeProblemForRole(problem, role) {
  if (!problem) return problem;
  if (role === 'interviewer') return problem;

  const sanitized = problem.toObject ? problem.toObject() : { ...problem };
  sanitized.testCases = sanitized.testCases.map((tc) =>
    tc.isHidden ? { input: tc.input, isHidden: true } : tc
  );
  return sanitized;
}

function sanitizeResultForRole(result, role) {
  if (role === 'interviewer' || result.mode !== 'testcases') return result;

  return {
    ...result,
    results: result.results.map((r) =>
      r.isHidden
        ? { passed: r.passed, isHidden: true } // strip input, expectedOutput, actualOutput
        : r
    ),
  };
}

module.exports = { sanitizeProblemForRole, sanitizeResultForRole };