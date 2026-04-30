'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/app/components/canvas/AnimatedBackground';
import styles from './page.module.css';

const SYMBOLS = ['∫','Σ','√','π','θ','Δ','λ','∞','∂','∇','α','β','γ','φ','ω','±','∈','≠','≡','∮','∑','∏','⊗','℃'];

export default function HomePage() {
  const router   = useRouter();
  const orb1Ref  = useRef(null);
  const orb2Ref  = useRef(null);
  const [splashDone,  setSplashDone]  = useState(false);
  const [splashLeave, setSplashLeave] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashLeave(true),  1600);
    const t2 = setTimeout(() => setSplashDone(true),   2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!splashDone) return;
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth  - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (orb1Ref.current) orb1Ref.current.style.transform = `translate(${x * -40}px,${y * -40}px)`;
      if (orb2Ref.current) orb2Ref.current.style.transform = `translate(${x *  30}px,${y *  30}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [splashDone]);

  return (
    <div className={styles.root}>
      {/* Splash */}
      {!splashDone && (
        <div className={`${styles.splash} ${splashLeave ? styles.splashLeave : ''}`}>
          <div className={styles.splashLogo}>
            <svg width="58" height="58" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="12" fill="url(#gSp)"/>
              <defs><linearGradient id="gSp" x1="0" y1="0" x2="44" y2="44"><stop stopColor="#6d28d9"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient></defs>
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="white" fontFamily="Georgia,serif" fontWeight="700">∑</text>
            </svg>
          </div>
          <div className={styles.splashName}>MathMax</div>
          <div className={styles.splashSpinner}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="12" stroke="rgba(109,40,217,0.18)" strokeWidth="2.5"/>
              <path d="M15 3 A12 12 0 0 1 27 15" stroke="url(#gSpin)" strokeWidth="2.5" strokeLinecap="round"/>
              <defs><linearGradient id="gSpin" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#6d28d9"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient></defs>
            </svg>
          </div>
        </div>
      )}

      {/* Main content */}
      {splashDone && (
        <>
          <AnimatedBackground />
          <div ref={orb1Ref} className={styles.orb1} />
          <div ref={orb2Ref} className={styles.orb2} />
          <div className={styles.orb3} />

          <div className={styles.symbols} aria-hidden="true">
            {SYMBOLS.map((s, i) => (
              <span key={i} className={styles.symbol} style={{
                left: `${(i * 4.1 + 2) % 94}%`, top: `${(i * 6.7 + 4) % 88}%`,
                fontSize: `${12 + (i % 5) * 7}px`,
                animationDelay: `${-i * 0.9}s`,
                animationDuration: `${8 + (i % 6) * 1.8}s`,
              }}>{s}</span>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.logoWrap} style={{ '--d': '0ms' }}>
              <div className={styles.logoPulse} />
              <svg width="52" height="52" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="12" fill="url(#gL)"/>
                <defs><linearGradient id="gL" x1="0" y1="0" x2="44" y2="44"><stop stopColor="#6d28d9"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient></defs>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="white" fontFamily="Georgia,serif" fontWeight="700">∑</text>
              </svg>
            </div>
            <h1 className={styles.title} style={{ '--d': '90ms' }}>MathMax</h1>
            <p className={styles.subtitle} style={{ '--d': '190ms' }}>AI-powered evaluation of handwritten math answer sheets</p>
            <button className={styles.enterBtn} style={{ '--d': '310ms' }} onClick={() => router.push('/auth')}>
              Get Started
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <div className={styles.features} style={{ '--d': '430ms' }}>
              <span className={styles.feature}>Instant AI grading</span>
              <span className={styles.featureDot} />
              <span className={styles.feature}>Any handwriting</span>
              <span className={styles.featureDot} />
              <span className={styles.feature}>Question-wise feedback</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
