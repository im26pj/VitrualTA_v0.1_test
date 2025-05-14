import * as d3 from 'd3';

export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export class MindMap {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;

  constructor(svgElement: SVGSVGElement, width = 1000, height = 600) {
    this.svg = d3.select(svgElement);
    this.width = width;
    this.height = height;
  }

  public render(data: TreeNode): void {
    this.svg.selectAll('*').remove();
    
    const root = d3.hierarchy<TreeNode>(data);
    const maxDepth = root.height;
    const horizontalSpacing = (this.width) / (maxDepth);
    
    const treeLayout = d3.tree<TreeNode>()
      .size([this.height, horizontalSpacing * maxDepth]);
    
    const treeData = treeLayout(root);

    const g = this.svg.append('g')
      .attr('transform', `translate(${this.width / 2},0)`);

    // 添加根節點的圓形
    const rootGroup = g.append('g')
      .attr('class', 'root-node')
      .attr('transform', `translate(0,${treeData.x})`);

    // 先添加文字以計算大小
    const rootText = rootGroup.append('text')
      .text(data.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#333');

    // 獲取文字的邊界框並計算圓的半徑，基礎大小更小
    const textBBox = rootText.node()!.getBBox();
    const radius = Math.max(textBBox.width, textBBox.height) * 0.6;

    // 添加圓形背景，移除邊框
    rootGroup.insert('circle', 'text')
      .attr('r', radius)
      .attr('fill', this.getNodeColor(0));

    // 繪製連接線
    g.selectAll('path.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', d => this.getNodeColor(d.target.depth))
      .attr('stroke-width', 3)
      .attr('d', d => {
        const sourceX = this.getXPosition(d.source);
        const sourceY = d.source.x;
        const targetX = this.getXPosition(d.target);
        const targetY = d.target.x;
        
        // 如果是從根節點出發的連線
        if (!d.source.parent) {
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const angle = Math.atan2(dy, dx);
          const startX = sourceX + (radius * Math.cos(angle));
          const startY = sourceY + (radius * Math.sin(angle));
          
          // 計算控制點位置以創建更自然的曲線
          const distance = Math.sqrt(dx * dx + dy * dy);
          const controlDistance = distance * 0.5; // 控制曲線的彎曲程度
          
          // 使用更靈活的控制點計算方式
          const cp1x = startX + (controlDistance * Math.cos(angle));
          const cp1y = startY;
          const cp2x = targetX - (controlDistance * Math.cos(angle));
          const cp2y = targetY;

          return `M${startX},${startY}
                  C${cp1x},${cp1y}
                   ${cp2x},${cp2y}
                   ${targetX},${targetY}`;
        }

        // 非根節點的連線使用不同的曲線控制點
        const isLeft = sourceX > targetX;
        const curvature = 0.5; // 控制曲線的彎曲程度
        const dx = Math.abs(targetX - sourceX) * curvature;
        const cp1x = sourceX + (isLeft ? -dx : dx);
        const cp2x = targetX + (isLeft ? dx : -dx);

        return `M${sourceX},${sourceY}
                C${cp1x},${sourceY}
                 ${cp2x},${targetY}
                 ${targetX},${targetY}`;
      });

    // 修改文字位置計算，確保不會太靠近中心
    g.selectAll('text.label')
      .data(treeData.descendants().filter(d => d.parent))
      .enter()
      .append('text')
      .attr('class', 'label')
      .text(d => d.data.name)
      .attr('x', d => {
        const parentX = this.getXPosition(d.parent);
        const currentX = this.getXPosition(d);
        // 調整文字位置，更靠近目標節點
        return (parentX * 0.3 + currentX * 0.7);
      })
      .attr('y', d => {
        const parentY = d.parent!.x;
        const currentY = d.x;
        // 調整文字位置，更靠近目標節點
        return ((parentY * 0.3 + currentY * 0.7)) - 10;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'baseline')
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('background', 'white');

    // 為文字添加白色背景以提高可讀性
    g.selectAll('text.label')
      .each(function() {
        const text = d3.select(this);
        const bbox = this.getBBox();
        const padding = 4;
        
        // 創建一個新的 g 元素來包含背景和文字
        const parent = d3.select(this.parentNode);
        const group = parent.append('g');
        
        // 添加背景矩形
        group.append('rect')
          .attr('x', bbox.x - padding)
          .attr('y', bbox.y - padding)
          .attr('width', bbox.width + (padding * 2))
          .attr('height', bbox.height + (padding * 2))
          .attr('fill', 'white')
          .attr('rx', 4);
        
        // 將文字移動到新的 group 中
        text.remove();
        group.append(() => this);
      });
  }

  // 修改：計算節點 X 座標，確保子節點跟隨父節點方向
  private getXPosition(d: any): number {
    if (!d.parent) return 0;  // 根節點位於中心

    // 找到最上層的父節點
    let topParent = d;
    while (topParent.parent && topParent.parent.parent) {
      topParent = topParent.parent;
    }

    // 根據第一層節點的索引決定方向
    const isLeft = topParent.parent ? 
      topParent.parent.children.indexOf(topParent) % 2 === 0 : 
      false;
    
    // 取得樹的最大深度
    const root = topParent.parent || topParent;
    const maxDepth = root.height;
    
    // 結合深度縮放和間距調整
    const depthFactor = 1.2; // 基礎間距調整
    const depthScaling = maxDepth ? (1 / maxDepth) : 1; // 深度縮放因子
    const scaledY = d.y * depthScaling * depthFactor;
    
    return (isLeft ? -1 : 1) * scaledY;
  }

  // 修改：計算文字 X 座標，配合新的節點位置邏輯
  private getTextXPosition(d: any): number {
    if (!d.parent) return 0;
    const isLeft = this.getXPosition(d) < 0;
    return isLeft ? -30 : 30;
  }

  // 修改：決定文字對齊方式，配合新的節點位置邏輯
  private getTextAnchor(d: any): string {
    if (!d.parent) return 'middle';
    const isLeft = this.getXPosition(d) < 0;
    return isLeft ? 'end' : 'start';
  }

  private getNodeColor(depth: number): string {
    const colors = ['#aed581', '#81c784', '#4db6ac', '#4fc3f7', '#7986cb'];
    return colors[depth % colors.length];
  }

  public static generateTestData(): TreeNode {
    return {
      name: "中心主題",
      children: [
        {
          name: "子節點 1"
        },
        {
          name: "子節點 2",
          children: [
            {
              name: "子節點 2-1"
            },
            {
              name: "子節點 2-2",
              children: [
                {
                  name: "子節點2-2-1"
                }
              ]
            }
          ]
        },
        {
          name: "子節點 3"
        }
      ]
    };
  }
}
