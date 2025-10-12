// types/react-native-svg-charts.d.ts
declare module 'react-native-svg-charts' {
  import { ComponentType } from 'react';
    import { ViewProps } from 'react-native';

  interface ChartProps<T> extends ViewProps {
    data: T[];
    style?: any;
    spacingInner?: number;
    spacingOuter?: number;
    contentInset?: { top?: number; left?: number; right?: number; bottom?: number };
    gridMin?: number;
    yMin?: number;
    yMax?: number;
    numberOfTicks?: number;
    svg?: any;
  }

  interface BarChartProps<T> extends ChartProps<T> {
    horizontal?: boolean;
  }

  interface AxisProps<T> extends ViewProps {
    data: T[];
    style?: any;
    contentInset?: { top?: number; left?: number; right?: number; bottom?: number };
    svg?: any;
    formatLabel?: (value: any, index: number) => string | number;
    numberOfTicks?: number;
    min?: number;
    max?: number;
  }

  export const BarChart: ComponentType<BarChartProps<any>>;
  export const XAxis: ComponentType<AxisProps<any>>;
  export const YAxis: ComponentType<AxisProps<any>>;
  export const Grid: ComponentType<any>;
}