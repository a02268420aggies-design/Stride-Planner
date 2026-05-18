"use client";

import { cn } from "@/lib/utils";
import { PriorityRing } from "./PriorityRing";
import { themeColors } from "@/constants/theme";

interface ConcentricRingsProps {
    outerTotal: number;
    outerCompleted: number;
    innerTotal: number;
    innerCompleted: number;
    centerTotal?: number;
    centerCompleted?: number;
    outerColor?: string;
    innerColor?: string;
    centerColor?: string;
    pulsingOuter?: boolean;
    pulsingInner?: boolean;
    pulsingCenter?: boolean;
    centerPercent?: number | null;
    className?: string;
}

export function ConcentricRings({
    outerTotal,
    outerCompleted,
    innerTotal,
    innerCompleted,
    centerTotal = 0,
    centerCompleted = 0,
    outerColor = themeColors.navy,
    innerColor = themeColors.sage,
    centerColor = "#475569", // Slate Blue/Charcoal
    pulsingOuter = false,
    pulsingInner = false,
    pulsingCenter = false,
    centerPercent,
    className,
}: ConcentricRingsProps) {
    const outerSize = 160;
    const innerSize = 132;
    const centerSize = 104; // Third ring
    const strokeWidth = 10;

    // Calculate total progress percentage for the central label (fallback if centerPercent is not provided)
    const fallbackTotalTasks = outerTotal + innerTotal + centerTotal;
    const fallbackTotalCompleted = outerCompleted + innerCompleted + centerCompleted;
    const computedPercentage = fallbackTotalTasks === 0 ? 0 : Math.round((fallbackTotalCompleted / fallbackTotalTasks) * 100);
    
    // Use the explicit centerPercent if provided, otherwise default to computing
    const displayPercentage = centerPercent !== undefined ? centerPercent : computedPercentage;

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: outerSize, height: outerSize }}
        >
            {/* Outer Ring (e.g. Assignments / Navy) */}
            <div className={cn("absolute transition-transform duration-300", pulsingOuter && "animate-scale-pulse-twice")}>
                <PriorityRing
                    totalTasks={outerTotal}
                    completedTasks={outerCompleted}
                    size={outerSize}
                    strokeWidth={strokeWidth}
                    color={outerColor}
                    showLabel={false}
                />
            </div>

            {/* Inner Ring (e.g. Health & Meals / Sage) */}
            <div className={cn("absolute transition-transform duration-300", pulsingInner && "animate-scale-pulse-twice")}>
                <PriorityRing
                    totalTasks={innerTotal}
                    completedTasks={innerCompleted}
                    size={innerSize}
                    strokeWidth={strokeWidth}
                    color={innerColor}
                    showLabel={false}
                />
            </div>

            {/* Center Ring (e.g. Goals / Amber) */}
            <div className={cn("absolute transition-transform duration-300", pulsingCenter && "animate-scale-pulse-twice")}>
                <PriorityRing
                    totalTasks={centerTotal}
                    completedTasks={centerCompleted}
                    size={centerSize}
                    strokeWidth={strokeWidth} // slightly thinner? let's keep it uniform
                    color={centerColor}
                    showLabel={false}
                />
            </div>

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full" style={{ width: centerSize - strokeWidth * 2, height: centerSize - strokeWidth * 2, margin: 'auto', backgroundColor: 'var(--color-background)' }}>
               {/* Mask layer built into the component */}
            </div>
            <div className="absolute flex flex-col items-center justify-center text-center -mt-0.5">
                {displayPercentage === null ? (
                    <span className="text-[#475569]/50 text-xl font-bold">Ready</span>
                ) : (
                    <>
                        <span className="text-2xl font-bold leading-none text-brand-navy dark:text-white">
                            {displayPercentage}%
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-brand-sage mt-1">
                            Done
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
