import * as pdfjsLib from 'pdfjs-dist';

// ضبط الـ Worker مع دعم التراجع لتجنب أخطاء المتصفح
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractCardsFromPDF(file: File): Promise<string[]> {
    try {
        // تحويل كائن الملف المرفوع تلقائياً إلى ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        let allCards: string[] = [];

        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            let items = textContent.items.map((item: any) => ({
                str: item.str ? item.str.trim() : '',
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

                    if (!isPhoneNumber && !allCards.includes(text)) {
                        allCards.push(text);
                    }
                }
            });
        }

        return allCards;
    } catch (error) {
        console.error("خطأ أثناء استخراج الكروت من الـ PDF:", error);
        throw new Error("تعذر قراءة ملف الـ PDF، تأكد من صحة الملف.");
    }
}
