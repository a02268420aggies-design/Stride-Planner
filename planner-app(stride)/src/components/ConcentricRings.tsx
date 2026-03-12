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
    className,
}: ConcentricRingsProps) {
    const outerSize = 160;
    const innerSize = 132;
    const centerSize = 104; // Third ring
    const strokeWidth = 10;

    // Calculate total progress percentage for the central label
    const totalTasks = outerTotal + innerTotal + centerTotal;
    const totalCompleted = outerCompleted + innerCompleted + centerCompleted;
    const percentage = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: outerSize, height: outerSize }}
        >
            {/* Outer Ring (e.g. Assignments / Navy) */}
            <div className="absolute">
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
            <div className="absolute">
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
            {(centerTotal > 0 || centerCompleted > 0) && (
                <div className="absolute">
                    <PriorityRing
                        totalTasks={centerTotal}
                        completedTasks={centerCompleted}
                        size={centerSize}
                        strokeWidth={strokeWidth} // slightly thinner? let's keep it uniform
                        color={centerColor}
                        showLabel={false}
                    />
                </div>
            )}

            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center text-center -mt-0.5">
                <span className="text-2xl font-bold leading-none text-brand-navy dark:text-white">
                    {percentage}%
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-brand-sage mt-1">
                    Done
                </span>
            </div>
        </div>
    );
}
