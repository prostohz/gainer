import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as R from 'remeda';

type TProps = {
  data?: { timestamp: number; value: number }[];
  colors: Record<string, string>;
};

export const MetricRolling = ({ data = [], colors }: TProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const levels = R.keys(colors).map(Number);

  useEffect(() => {
    if (!data.length || !svgRef.current) {
      return;
    }

    // Очищаем предыдущий график
    d3.select(svgRef.current).selectAll('*').remove();

    // Размеры графика
    const margin = { top: 20, right: 30, bottom: 50, left: 40 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Создаем SVG контейнер
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Шкалы
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([Math.min(...levels) * 1.2, Math.max(...levels) * 1.2])
      .range([height, 0]);

    // Линия для метрики
    const line = d3
      .line<{ timestamp: number; value: number }>()
      .x((d) => x(new Date(d.timestamp)))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    // Оси
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((d) => {
            const date = d as Date;
            return d3.timeFormat('%H:%M')(date);
          }),
      )
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dy', '1em');

    svg.append('g').call(d3.axisLeft(y).tickFormat((d) => d.toString()));

    // Добавляем фон для графика
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#1e293b')
      .attr('opacity', 0.3);

    levels.forEach((level) => {
      svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', y(level))
        .attr('x2', width)
        .attr('y2', y(level))
        .attr('stroke', colors[level.toString()])
        .attr('stroke-dasharray', level === 0 ? '0' : '3,3')
        .attr('stroke-width', level === 0 ? 0.5 : 1);
    });

    // Добавляем линию z-score с более плавным переходом
    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8884d8')
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Добавляем подсказку при наведении
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', '#1e293b')
      .style('color', 'white')
      .style('border', '1px solid #334155')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)');

    // Добавляем невидимую область для отслеживания движения мыши
    const bisect = d3.bisector<{ timestamp: number; value: number }, Date>(
      (d) => new Date(d.timestamp),
    ).left;

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => tooltip.style('opacity', 0.9))
      .on('mouseout', () => tooltip.style('opacity', 0))
      .on('mousemove', (event) => {
        const mouseX = d3.pointer(event)[0];
        const x0 = x.invert(mouseX);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];

        if (!d0 || !d1) {
          return;
        }

        const d = x0.getTime() - d0.timestamp > d1.timestamp - x0.getTime() ? d1 : d0;

        tooltip
          .html(
            `<div>Date: ${new Date(d.timestamp).toLocaleDateString()}</div>
             <div>Time: ${new Date(d.timestamp).toLocaleTimeString()}</div>
             <div>Z-Score: ${d.value.toFixed(4)}</div>`,
          )
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 28}px`);
      });
  }, [data]);

  return (
    <div className="h-[300px] w-full">
      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};
