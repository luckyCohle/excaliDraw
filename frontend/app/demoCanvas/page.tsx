"use client";
import React, {  useRef } from 'react'
import { useParams, useRouter } from 'next/navigation';
import DemoCanvas from '@/components/demoCanvas';

export default function DemoCanvasPage({}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const params = useParams();
    const router = useRouter();
    return(
      <div>
        <DemoCanvas/>
      </div>
    )
}
