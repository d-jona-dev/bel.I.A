"use client";

import React, { useEffect } from 'react';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

const AdBanner: React.FC = () => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error:", e);
        }
    }, []);

    return (
        <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // IMPORTANT: Remplacez par votre ID d'éditeur
            data-ad-slot="YYYYYYYYYY"               // IMPORTANT: Remplacez par votre ID de bloc d'annonces
            data-ad-format="auto"
            data-full-width-responsive="true"
        ></ins>
    );
};

export default AdBanner;
