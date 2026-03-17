
const calculateStudentMetrics = (s) => {
    const getTrimesterAvg = (g) => {
      if (!g) return 0;
      if (typeof g === 'number') return g;
      if (typeof g === 'string') return parseFloat(g) || 0;
      if (typeof g === 'object') {
        const fields = [g.lenguajes, g.saberes, g.etica, g.humano].map(v => Number(v) || 0);
        const validFields = fields.filter(v => v > 0);
        return validFields.length > 0 ? validFields.reduce((a, b) => a + b, 0) / validFields.length : 0;
      }
      return 0;
    };

    const trimAvgs = (s.grades || []).map(getTrimesterAvg);
    const activeTrims = trimAvgs.filter(a => a > 0);
    const academicAvg = activeTrims.length > 0 ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length : 0;
    
    const hwScore = s.totalAssignments > 0 ? (s.assignmentsCompleted / s.totalAssignments) * 10 : 0;
    
    // behaviorScore: Base 8.0, +/- points. Capped at 10, min 5.
    const conductScore = Math.max(5, Math.min(10, 8 + ((s.behaviorPoints || 0) * 0.1)));
    
    // Weighted Average: 40% Academic, 40% Homework, 20% Conduct
    let finalAvgVar = 0;
    if (academicAvg > 0) {
      finalAvgVar = (academicAvg * 0.4) + (hwScore * 0.4) + (conductScore * 0.2);
    } else {
      finalAvgVar = (hwScore * 0.6) + (conductScore * 0.4);
    }

    return { 
      trimAvgs, 
      academicAvg, 
      hwScore, 
      conductScore,
      finalAvg: academicAvg > 0 || hwScore > 0 ? Math.min(10, finalAvgVar).toFixed(1) : '-' 
    };
};

const damari = {
    name: 'GAMEZ LOPEZ DAMARI',
    grades: [{ lenguajes: 9.5, saberes: 9.5, etica: 9.5, humano: 9.5 }],
    assignmentsCompleted: 15,
    totalAssignments: 10,
    behaviorPoints: 20
};

console.log(calculateStudentMetrics(damari));
