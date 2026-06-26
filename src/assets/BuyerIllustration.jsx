import React from 'react';

export default function BuyerIllustration() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {/* استدعاء الصورة من مجلد public مباشرة */}
      <img 
       src="/buyer.png" alt="مشتري"
       
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        }} 
      />
    </div>
  );
}