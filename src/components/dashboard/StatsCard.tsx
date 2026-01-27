import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "destructive" | "info";
}

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald/10 text-emerald",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-rose/10 text-rose",
  info: "bg-cyan/10 text-cyan",
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  return (
    <Card className="hover-lift border-border/50 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-200 hover:scale-110", variantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1.5 font-medium",
            trend.isPositive ? "text-emerald" : "text-rose"
          )}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last week
          </p>
        )}
      </CardContent>
    </Card>
  );
}