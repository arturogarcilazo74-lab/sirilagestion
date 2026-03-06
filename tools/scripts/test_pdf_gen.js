

import { jsPDF } from 'jspdf';

console.log('Testing jsPDF generation...');

try {
    const doc = new jsPDF();
    console.log('jsPDF instance created.');

    doc.text('Hello World', 10, 10);
    console.log('Text added.');

    // We can't save to file in browser-like environment easily without fs, 
    // but if we are in node we can use output.
    // However, jspdf in node usually needs specific polyfills or export.
    // Standard jspdf is for browser.

    const output = doc.output();
    console.log('PDF output generated, length:', output.length);

} catch (error) {
    console.error('Error generating PDF:', error);
}
