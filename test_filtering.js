function normalize(str) {
    return (str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchGroups(target, studentGroup) {
    const student = studentGroup.toUpperCase().trim();
    const t = (target || '').toUpperCase().trim();

    // 2. Global assignments
    if (!t || t === 'GLOBAL' || t === 'TODOS' || t === '') return true;

    // 3. Direct match
    if (t === student) return true;

    // 4. Normalized match
    if (normalize(t) === normalize(student)) return true;

    // 5. Grade match
    const targetGrade = t.match(/(\d+)/)?.[0];
    const studentGrade = student.match(/(\d+)/)?.[0];
    const targetLetter = t.match(/[A-F]/)?.[0];
    const studentLetter = student.match(/[A-F]/)?.[0];

    if (targetGrade && studentGrade && targetGrade === studentGrade) {
        if (targetLetter && studentLetter) {
            return targetLetter === studentLetter;
        }
        return !targetLetter; 
    }

    return false;
}

const tests = [
    { target: '4 A', student: '4 A', expected: true },
    { target: '4 A', student: '4A', expected: true },
    { target: '4TO A', student: '4 A', expected: true },
    { target: '4', student: '4 A', expected: true },
    { target: '4 B', student: '4 A', expected: false },
    { target: 'GLOBAL', student: '4 A', expected: true },
    { target: 'TODOS', student: '6 B', expected: true },
    { target: '6A005616A', student: '6A', expected: true }, // Normalized match
    { target: '6A', student: '6A005616A', expected: true }, // Normalized match
];

tests.forEach(test => {
    const result = matchGroups(test.target, test.student);
    console.log(`Target: "${test.target}" | Student: "${test.student}" | Expected: ${test.expected} | Result: ${result} | ${result === test.expected ? '✅' : '❌'}`);
});
