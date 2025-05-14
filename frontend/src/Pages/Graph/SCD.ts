// SCD.ts
import * as d3 from 'd3';

export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sourceCount?: number;
  targetCount?: number;
  selected?: boolean;
}

export interface Link {
  source: string;
  target: string;
  label: string;  // 將 type 改為 label
  pathPoints?: any;
  sourceIndex?: number;
  targetIndex?: number;
  sourceTotal?: number;
  targetTotal?: number;
  verticalHeight?: number;
  selected?: boolean;
  directDistance?: number;
  isSourceLeft?: boolean;
}

export class SystemContextDiagram {
  private minNodeWidth = 180;   // 框框的最小寬度
  private minNodeHeight = 80;   // 框框的最小高度
  private baseVerticalSpacing = 30; // 修改為原始版本的值
  private heightIncrement = 16; // 修改為原始版本的值
  private idealSpacing = 10;
  private snapTolerance = 5;

  parseInput(inputText: string): { nodes: Node[]; links: Link[] } {
    const jsonMatch = inputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('無法從輸入中找到 JSON 區塊');
    }
    const parsed = JSON.parse(jsonMatch[0]);

    const sourceCount = {};
    const targetCount = {};

    parsed.links.forEach((link: any) => {
      sourceCount[link.source] = (sourceCount[link.source] || 0) + 1;
      targetCount[link.target] = (targetCount[link.target] || 0) + 1;
    });

    const nodes: Node[] = this.createNodes(parsed.nodes, sourceCount, targetCount);
    const links: Link[] = this.calculateLinks(parsed.links, nodes);

    return { nodes, links };
  }

  private createNodes(rawNodes: any[], sourceCount: any, targetCount: any): Node[] {
    const centerY = 400; // 調整中心Y軸位置至畫布中央
    const spacing = 400; // 兩個節點之間的水平間距
    const startX = 400; // 起始X座標

    return rawNodes.map((node: any, index: number) => {
      const sources = sourceCount[node.id] || 0;
      const targets = targetCount[node.id] || 0;
      const connectionCount = Math.max(sources, targets);
      const width = Math.max(this.minNodeWidth, connectionCount * 30);

      let x, y;
      if (rawNodes.length === 2) {
        // 當只有兩個節點時，將它們水平對齊在中央
        x = (index === 0) ? startX : startX + spacing;
        y = centerY;
      } else {
        // 原有的位置計算邏輯
        x = 300 + index * 200;
        y = 300 + index * 150;
      }

      return {
        id: node.id,
        label: node.label || node.id,
        x: node.x ?? x,
        y: node.y ?? y,
        width: width,
        height: this.minNodeHeight,
        sourceCount: sources,
        targetCount: targets
      };
    });
  }

  private calculateLinks(rawLinks: any[], nodes: Node[]): Link[] {
    const sourceCounts = {};
    const targetCounts = {};
    const linksBySource = {};

    nodes.forEach(node => {
      sourceCounts[node.id] = 0;
      targetCounts[node.id] = 0;
    });

    const links: Link[] = rawLinks.map(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);

      let directDistance = Infinity;
      if (sourceNode && targetNode) {
        const dx = sourceNode.x - targetNode.x;
        const dy = sourceNode.y - targetNode.y;
        directDistance = Math.sqrt(dx * dx + dy * dy);
      }

      return {
        source: link.source,
        target: link.target,
        label: link.label || '',  // 將 type 改為 label
        directDistance,
        isSourceLeft: sourceNode.x < targetNode.x,
        verticalHeight: this.baseVerticalSpacing
      };
    });

    links.forEach(link => {
      if (!linksBySource[link.source]) {
        linksBySource[link.source] = [];
      }
      linksBySource[link.source].push(link);
    });

    Object.entries(linksBySource).forEach(([source, sourceLinks]: [string, Link[]]) => {
      const sourceNode = nodes.find(n => n.id === source);
      if (!sourceNode) return;

      sourceLinks.sort((a, b) => b.directDistance - a.directDistance);

      sourceLinks.forEach((link, index) => {
        const targetNode = nodes.find(n => n.id === link.target);
        if (!targetNode) return;

        sourceCounts[link.source] = (sourceCounts[link.source] || 0) + 1;
        targetCounts[link.target] = (targetCounts[link.target] || 0) + 1;

        if (link.isSourceLeft) {
          link.sourceIndex = sourceCounts[link.source];
          link.targetIndex = targetNode.targetCount - targetCounts[link.target] + 1;
        } else {
          link.sourceIndex = sourceNode.sourceCount - sourceCounts[link.source] + 1;
          link.targetIndex = targetCounts[link.target];
        }

        link.sourceTotal = sourceNode.sourceCount;
        link.targetTotal = targetNode.targetCount;

        const maxIndex = sourceLinks.length - 1;
        const heightIndex = maxIndex - index;
        link.verticalHeight = this.baseVerticalSpacing + heightIndex * this.heightIncrement;
      });
    });

    return links;
  }

  public calculatePathPoints(link: Link, nodes: Node[]): string {
    const sourceNode = nodes.find(n => n.id === link.source);
    const targetNode = nodes.find(n => n.id === link.target);
    if (!sourceNode || !targetNode) return '';

    const sourceWidth = sourceNode.width || this.minNodeWidth;
    const sourceHeight = sourceNode.height || this.minNodeHeight;
    const targetWidth = targetNode.width || this.minNodeWidth;
    const targetHeight = targetNode.height || this.minNodeHeight;

    const isSourceLeftOfTarget = sourceNode.x < targetNode.x;
    const sourceConnectSide = isSourceLeftOfTarget ? 'top' : 'bottom';
    const targetConnectSide = isSourceLeftOfTarget ? 'top' : 'bottom';

    const sourceOffset = this.calculateOffset(sourceWidth, link.sourceIndex, sourceNode.sourceCount);
    const targetOffset = this.calculateOffset(targetWidth, link.targetIndex, targetNode.targetCount);

    const sourceX = sourceNode.x - (sourceWidth / 2) + sourceOffset;
    const sourceY = sourceNode.y + (sourceConnectSide === 'top' ? -sourceHeight / 2 : sourceHeight / 2);

    const targetX = targetNode.x - (targetWidth / 2) + targetOffset;
    const targetY = targetNode.y + (targetConnectSide === 'top' ? -targetHeight / 2 : targetHeight / 2);

    const vertHeight = link.verticalHeight || this.baseVerticalSpacing;
    const commonMidY = sourceConnectSide === 'top' ?
      Math.min(sourceY, targetY) - vertHeight :
      Math.max(sourceY, targetY) + vertHeight;

    link.pathPoints = {
      sourceX, sourceY,
      midY1: commonMidY,
      targetX, targetY,
      midY2: commonMidY,
      sourceConnectSide, targetConnectSide
    };

    return `M ${sourceX},${sourceY} L ${sourceX},${commonMidY} L ${targetX},${commonMidY} L ${targetX},${targetY}`;
  }

  private calculateOffset(width: number, index: number, total: number): number {
    return (width / (total + 1)) * index;
  }

  private initializeArrowMarkers(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    const defs = svg.append('defs');
    ['up', 'down'].forEach(direction => {
      defs.append('marker')
        .attr('id', `arrow-${direction}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', direction === 'up' ? 'auto-start-reverse' : 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#555');
    });
  }

  private calculateBounds(data: { nodes: Node[]; links: Link[] }) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    data.nodes.forEach(node => {
      const halfWidth = (node.width || this.minNodeWidth) / 2;
      const halfHeight = (node.height || this.minNodeHeight) / 2;
      minX = Math.min(minX, node.x - halfWidth);
      maxX = Math.max(maxX, node.x + halfWidth);
      minY = Math.min(minY, node.y - halfHeight);
      maxY = Math.max(maxY, node.y + halfHeight);
    });
    return { minX, maxX, minY, maxY };
  }

  generateTestData() {
    return {
        "nodes": [
            { "id": "User", "type": "external" },
            { "id": "Virtual TA 管理", "type": "process" }
          ],
          "links": [
            { "source": "User", "target": "Virtual TA 管理", "label": "更新後的帳號/密碼" },
            { "source": "User", "target": "Virtual TA 管理", "label": "會員註冊帳號" },
            { "source": "User", "target": "Virtual TA 管理", "label": "會員註冊密碼" },
            { "source": "User", "target": "Virtual TA 管理", "label": "會員登入帳號" },
            { "source": "User", "target": "Virtual TA 管理", "label": "會員登入密碼" },
            { "source": "User", "target": "Virtual TA 管理", "label": "班級創件資料" },
            { "source": "User", "target": "Virtual TA 管理", "label": "教學造型選擇" },
            { "source": "User", "target": "Virtual TA 管理", "label": "學習的問題" },
            { "source": "User", "target": "Virtual TA 管理", "label": "使用者姓名" },
            { "source": "User", "target": "Virtual TA 管理", "label": "付款資訊" },
            { "source": "User", "target": "Virtual TA 管理", "label": "教材" },
            { "source": "User", "target": "Virtual TA 管理", "label": "題目" },
            { "source": "Virtual TA 管理", "target": "User", "label": "視覺化教學影片" },
            { "source": "Virtual TA 管理", "target": "User", "label": "系統建議的答案" },
            { "source": "Virtual TA 管理", "target": "User", "label": "格式化過的題目" },
            { "source": "Virtual TA 管理", "target": "User", "label": "學習狀況" }
          ]
    };
  }
}
