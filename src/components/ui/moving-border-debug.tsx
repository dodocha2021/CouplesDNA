"use client";
import React, { useEffect } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

export function MovingBorderDebug() {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / 2000;
      const newProgress = (time * pxPerMillisecond) % length;
      progress.set(newProgress);
      
      // 调试输出
      if (time % 1000 < 16) { // 每秒输出一次
        console.log('Animation frame:', time, 'Progress:', newProgress, 'Length:', length);
      }
    }
  });

  const x = useTransform(
    progress,
    (val) => {
      const point = pathRef.current?.getPointAtLength(val);
      console.log('Transform x:', val, point?.x);
      return point?.x || 0;
    }
  );
  const y = useTransform(
    progress,
    (val) => {
      const point = pathRef.current?.getPointAtLength(val);
      console.log('Transform y:', val, point?.y);
      return point?.y || 0;
    }
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  useEffect(() => {
    console.log('Component mounted, pathRef:', pathRef.current);
    if (pathRef.current) {
      console.log('Path length:', pathRef.current.getTotalLength());
    }
  }, []);

  return (
    <div className="relative w-40 h-16 bg-transparent p-[1px] overflow-hidden rounded-[20px] border border-red-500">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full border border-blue-500"
        width="100%"
        height="100%"
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="20"
          ry="20"
          fill="none"
          stroke="red"
          strokeWidth="2"
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        <div className="h-8 w-8 bg-red-500 rounded-full" />
      </motion.div>
      
      <div className="relative bg-slate-900/[0.8] border border-slate-800 backdrop-blur-xl text-white flex items-center justify-center w-full h-full text-sm antialiased rounded-[20px]">
        Debug
      </div>
    </div>
  );
} 