import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Share2 } from 'lucide-react'

/**
 * StoreQRCode — يولّد QR code لصفحة المتجر العامة (يلي الزباين بيشوفوها)
 * ويسمح للبائع يحمّله كصورة أو يشاركه مباشرة (Web Share API).
 *
 * 🎨 تصميم مضغوط: كارد بعرض محدود (max-width)، QR وسط مع المعلومات
 *    والأزرار مرتبة بشكل أفقي جنب بعض بدل ما ياخدوا عرض الصفحة كامل.
 *
 * الاستخدام:
 *   <StoreQRCode storeId={store._id} storeName={store.storeName} />
 */
export default function StoreQRCode({ storeId, storeName = 'المتجر' }) {
  const canvasWrapperRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const storeUrl = `${window.location.origin}/customer/store/${storeId}`

  const handleDownload = () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-${storeName.replace(/\s+/g, '-')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `qr-${storeName}.png`, { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `متجر ${storeName}`,
            text: `تسوّق من متجر ${storeName} على Gaza Gate`,
            url: storeUrl,
            files: [file],
          })
        } else if (navigator.share) {
          await navigator.share({
            title: `متجر ${storeName}`,
            text: `تسوّق من متجر ${storeName} على Gaza Gate`,
            url: storeUrl,
          })
        } else {
          await navigator.clipboard.writeText(storeUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      })
    } catch (err) {
      console.warn('Share cancelled or failed:', err)
    }
  }

  return (
    <div
      style={{
        maxWidth: 420, // 🆕 عرض محدود بدل ما ياخد عرض الصفحة كامل
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '1.25rem',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
        QR Code تبع متجرك
      </h3>
      <p style={{ margin: '4px 0 1rem', fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>
        شارك هالكود مع زبائنك — أي حدا يمسحه بيوديه مباشرة لصفحة متجرك
      </p>

      {/* 🆕 صف أفقي: QR صغير على اليمين + الرابط والأزرار على الشمال */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          ref={canvasWrapperRef}
          style={{
            flexShrink: 0,
            padding: 8,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            lineHeight: 0, // يشيل أي مسافة زايدة تحت الـ canvas
          }}
        >
          <QRCodeCanvas
            value={storeUrl}
            size={104} // 🆕 كان 200 — صار أصغر بكثير ومناسب لكارد مضغوط
            level="H"
            fgColor="#111827"
            bgColor="#ffffff"
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleShare}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 10px',
                background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                fontFamily: "'Tajawal', sans-serif",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {!copied && <Share2 size={14} />}
              {copied ? 'تم نسخ الرابط' : 'مشاركة'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              aria-label="تحميل"
              title="تحميل"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                padding: '8px 0',
                background: '#fff',
                border: '1.5px solid #f97316',
                color: '#f97316',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}