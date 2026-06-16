import PDFDocument from 'pdfkit';

export const generateInterviewReportPDF = (session, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffer => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header
      doc.fontSize(24).fillColor('#2c3e50').text('Interview Performance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).fillColor('#34495e').text(`Candidate: ${user?.name || 'Anonymous'}`);
      doc.text(`Date: ${new Date(session.completedAt || session.startedAt).toLocaleDateString()}`);
      doc.text(`Session Type: ${session.sessionType.toUpperCase()}`);
      doc.moveDown(2);

      // Score Summary
      const percentage = session.percentage || (session.finalMaxScore > 0 ? Math.round((session.finalScore/session.finalMaxScore)*100) : 0);
      doc.fontSize(18).fillColor('#2980b9').text('Overall Summary');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('black');
      doc.text(`Total Score: ${session.finalScore || 0} / ${session.finalMaxScore || 0}`);
      doc.text(`Accuracy: ${percentage}%`);
      doc.moveDown();

      // DSA Module
      if (session.dsaQuestions && session.dsaQuestions.length > 0) {
        doc.fontSize(16).fillColor('#16a085').text('DSA Coding Module');
        doc.moveDown(0.5);
        session.dsaQuestions.forEach((q, idx) => {
          doc.fontSize(12).fillColor('black').text(`Q${idx + 1}: ${q.problemTitle} (${q.difficulty})`);
          if (q.isSkipped) {
            doc.fillColor('red').text('Skipped');
          } else {
            doc.fillColor('gray').text(`Tests Passed: ${q.testResults?.passedTests || 0} / ${q.testResults?.totalTests || 0} | Score: ${q.score}/${q.maxScore}`);
            if (q.submittedCode) {
              doc.moveDown(0.5);
              doc.fontSize(10).font('Courier').text(q.submittedCode.substring(0, 300) + (q.submittedCode.length > 300 ? '...' : ''), { width: 400 });
              doc.font('Helvetica');
            }
          }
          doc.moveDown();
        });
      }

      // Conceptual Module
      if (session.conceptualQuestions && session.conceptualQuestions.length > 0) {
        doc.fontSize(16).fillColor('#8e44ad').text('Conceptual Interview Module');
        doc.moveDown(0.5);
        session.conceptualQuestions.forEach((q, idx) => {
          doc.fontSize(12).fillColor('black').text(`Q${idx + 1}: ${q.questionText}`);
          doc.fillColor('gray').fontSize(10).text(`Category: ${q.category} | Difficulty: ${q.difficulty}`);
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#2c3e50').text(`Score: ${q.aiEvaluation?.score || 0}/10`);
          doc.fillColor('#7f8c8d').text(`Feedback: ${q.aiEvaluation?.feedback || 'No feedback provided.'}`);
          doc.moveDown();
        });
      }

      // Project Module
      if (session.projectQuestions && session.projectQuestions.length > 0) {
        doc.fontSize(16).fillColor('#e67e22').text('Project Interview Module');
        doc.moveDown(0.5);
        session.projectQuestions.forEach((q, idx) => {
          doc.fontSize(12).fillColor('black').text(`Q${idx + 1}: ${q.questionText}`);
          if (q.isFollowUp) doc.fillColor('#d35400').fontSize(10).text('(Follow-up Question)');
          doc.fillColor('gray').fontSize(10).text(`Context: ${q.context || 'General'}`);
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#2c3e50').text(`Score: ${q.aiEvaluation?.score || 0}/10`);
          doc.fillColor('#7f8c8d').text(`Feedback: ${q.aiEvaluation?.feedback || 'No feedback provided.'}`);
          doc.moveDown();
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor('gray').text('Generated automatically by Sarthi.ai - Your AI Interview Platform', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
