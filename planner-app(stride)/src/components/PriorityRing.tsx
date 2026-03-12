"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { themeColors } from "@/constants/theme";

interface PriorityRingProps {
    totalTasks: number;
    completedTasks: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    color?: string; // Replaced isPriority boolean with explicit color
    showLabel?: boolean; // Controls rendering of the default internal label
}

export function PriorityRing({
    totalTasks,
    completedTasks,
    size = 64,
    strokeWidth = 6,
    className,
    color = themeColors.navy, // Default to Navy
    showLabel = true,
}: PriorityRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = totalTasks === 0 ? 0 : Math.min(Math.max(completedTasks / totalTasks, 0), 1);
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
            {/* Background Circle */}
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    className="transition-colors duration-300 opacity-20"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Animated Progress Circle */}
                <motion.circle
                    className="transition-colors duration-300"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />
            </svg>
            {/* Text inside */}
            {showLabel && (
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold leading-none text-foreground">
                        {completedTasks}/{totalTasks}
                    </span>
                </div>
            )}
        </div>
    );
}
