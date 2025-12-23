/**
 * USB Barcode Scanner Support
 * 
 * USB barcode scanner'lar odatda klaviatura sifatida ishlaydi.
 * Ular tez yozadi (100ms ichida ko'p karakterlar) va Enter tugmasini bosadi.
 */

class BarcodeScanner {
    constructor(options = {}) {
        this.minLength = options.minLength || 3;  // Minimum barcode uzunligi
        this.maxLength = options.maxLength || 50; // Maximum barcode uzunligi
        this.timeout = options.timeout || 100;    // ms - barcode deb hisoblash uchun maksimal vaqt
        this.onScan = options.onScan || null;     // Callback funksiyasi
        this.onScanStart = options.onScanStart || null;
        
        this.lastKeyTime = 0;
        this.inputBuffer = '';
        this.scanning = false;
        this.timeoutId = null;
    }
    
    /**
     * Input element'ga event listener qo'shadi
     */
    attach(inputElement) {
        if (!inputElement) {
            console.error('BarcodeScanner: Input element not found');
            return;
        }
        
        inputElement.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        inputElement.addEventListener('keypress', (e) => {
            this.handleKeyPress(e);
        });
        
        inputElement.addEventListener('paste', (e) => {
            // Paste event'ni ham qo'llab-quvvatlash (ayrim scanner'lar paste qiladi)
            setTimeout(() => {
                const value = inputElement.value;
                if (this.isValidBarcode(value)) {
                    this.triggerScan(value);
                }
            }, 50);
        });
        
        // Placeholder yoki title'ga barcode scanner qo'llab-quvvatlanayotganini ko'rsatish
        if (!inputElement.placeholder.includes('Barcode')) {
            inputElement.placeholder = inputElement.placeholder + ' (yoki Barcode skan qiling)';
        }
    }
    
    /**
     * KeyDown event handler
     */
    handleKeyDown(e) {
        const now = Date.now();
        const timeSinceLastKey = now - this.lastKeyTime;
        
        // Enter tugmasi bosilganda
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            
            // Agar buffer bo'sh bo'lmasa va valid barcode bo'lsa
            const currentValue = e.target.value || this.inputBuffer;
            if (currentValue && this.isValidBarcode(currentValue)) {
                this.triggerScan(currentValue);
                e.target.value = '';  // Clear input
                this.inputBuffer = '';
            }
            this.lastKeyTime = 0;
            this.scanning = false;
            return;
        }
        
        // Tez ketma-ket bosilganda (barcode scanner belgisi)
        if (timeSinceLastKey < this.timeout && this.lastKeyTime > 0) {
            this.scanning = true;
            if (this.onScanStart && !this.inputBuffer) {
                this.onScanStart();
            }
        } else if (timeSinceLastKey >= this.timeout) {
            // Vaqt o'tib ketgan - yangi scan boshlandi
            this.inputBuffer = '';
            this.scanning = false;
        }
        
        this.lastKeyTime = now;
        
        // Clear timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        // Agar vaqt o'tib ketsa, buffer'ni tozalash
        this.timeoutId = setTimeout(() => {
            if (this.scanning && this.inputBuffer) {
                const currentValue = e.target.value || this.inputBuffer;
                if (this.isValidBarcode(currentValue)) {
                    this.triggerScan(currentValue);
                    e.target.value = '';
                }
                this.inputBuffer = '';
                this.scanning = false;
            }
        }, this.timeout);
    }
    
    /**
     * KeyPress event handler - karakterlarni yig'adi
     */
    handleKeyPress(e) {
        // Faqat printable karakterlarni qabul qilish
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Input element'ning hozirgi qiymatini olish
            const currentValue = e.target.value || '';
            this.inputBuffer = currentValue + e.key;
        }
    }
    
    /**
     * Barcode validligini tekshirish
     */
    isValidBarcode(value) {
        if (!value || typeof value !== 'string') return false;
        const trimmed = value.trim();
        return trimmed.length >= this.minLength && trimmed.length <= this.maxLength;
    }
    
    /**
     * Scan event'ni trigger qilish
     */
    triggerScan(barcode) {
        const trimmed = barcode.trim();
        if (trimmed && this.onScan) {
            console.log('Barcode scanned:', trimmed);
            this.onScan(trimmed);
        }
    }
    
    /**
     * Detach - event listener'larni olib tashlash
     */
    detach() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.inputBuffer = '';
        this.scanning = false;
        this.lastKeyTime = 0;
    }
}

// Global instance yaratish
window.BarcodeScanner = BarcodeScanner;

