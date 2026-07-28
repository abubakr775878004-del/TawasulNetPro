// src/pdfReader.js
import * as pdfjsLib from 'pdfjs-dist';

// تعيين مسار الـ worker الخاص بمكتبة pdfjs لتعمل بكفاءة داخل متصفح Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractCardsFromPDF(pdfData) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    let allCards = [];

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        let items = textContent.items.map(item => ({
            str: item.str.trim(),
            x: item.transform[4],
            y: item.transform[5]
        }));

        items = items.filter(item => item.str.length > 0);

        // ترتيب العناصر حسب الإحداثيات لدعم الأعمدة المتعددة (3 أو 4 أعمدة)
        items.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 6) {
                return b.y - a.y; 
            }
            return a.x - b.x; 
        });

        items.forEach(item => {
            const text = item.str;
            const cardRegex = /^([A-Za-z]?\d{7,12})$/;

            if (cardRegex.test(text)) {
                // استبعاد أرقام الهواتف التي تبدأ بـ 77 ومكونة من 9 أرقام
                const isPhoneNumber = /^77\d{7}$/.test(text);

                if (!isPhoneNumber) {
                    if (!allCards.includes(text)) {
                        allCards.push(text);
                    }
                }
            }
        });
    }

    return allCards;
}
