import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SystemContextDiagram, Node, Link } from './SCD';
import { MindMap } from './mindmap';

const FreeContextDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<'graph' | 'mindmap'>('graph');
  const [mindmap, setMindmap] = useState<MindMap | null>(null);

  const scd = new SystemContextDiagram();

  useEffect(() => {
    if (svgRef.current && displayMode === 'mindmap') {
      setMindmap(new MindMap(svgRef.current, 1200, 800));
    }
  }, [displayMode]);

  const handleGenerate = () => {
    try {
      if (displayMode === 'graph') {
        const newData = scd.parseInput(inputText);
        setData(newData);
      } else if (mindmap) {
        const mindMapData = JSON.parse(inputText);
        mindmap.render(mindMapData);
      }
    } catch (error) {
      console.error('解析錯誤:', error);
      alert('❌ 解析失敗，請確認是正確的 JSON 格式');
    }
  };

  const handleAddNode = (x?: number, y?: number) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      label: `新節點`,
      x: x ?? 300,
      y: y ?? 300,
      width: 240,
      height: 120,
      sourceCount: 0,
      targetCount: 0
    };
    setData(prev => ({
      nodes: [...prev.nodes, newNode],
      links: [...prev.links]
    }));
    setSelectedNode(newNode);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== selectedNode.id),
      links: prev.links.filter(l => l.source !== selectedNode.id && l.target !== selectedNode.id)
    }));
    setSelectedNode(null);
  };

  const handleDeleteLink = () => {
    if (!selectedLink) return;
    setData(prev => ({
      nodes: [...prev.nodes],
      links: prev.links.filter(l => !(l.source === selectedLink.source && 
                                    l.target === selectedLink.target && 
                                    l.label === selectedLink.label))
    }));
    setSelectedLink(null);
  };

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0 || displayMode !== 'graph') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1200;
    const height = 800;
    svg.attr('width', width)
       .attr('height', height)
       .style('background', '#fff');

    // 添加縮放容器
    const zoomContainer = svg.append('g');
    const mainContainer = zoomContainer.append('g').attr('class', 'main-container');
    const linkGroup = mainContainer.append('g').attr('class', 'links');
    const nodeGroup = mainContainer.append('g').attr('class', 'nodes');

    // 計算邊界
    const padding = 50;
    const bounds = {
      minX: d3.min(data.nodes, d => d.x - (d.width || 240) / 2) || 0,
      maxX: d3.max(data.nodes, d => d.x + (d.width || 240) / 2) || width,
      minY: d3.min(data.nodes, d => d.y - (d.height || 120) / 2) || 0,
      maxY: d3.max(data.nodes, d => d.y + (d.height || 120) / 2) || height
    };

    // 計算縮放比例
    const xScale = (width - padding * 2) / (bounds.maxX - bounds.minX);
    const yScale = (height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(xScale, yScale, 1);

    // 計算平移量，使內容居中
    const translateX = (width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
    const translateY = (height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;

    // 設置縮放行為
    const zoom = d3.zoom()
      .scaleExtent([0.2, 1.5]) // 修改縮放範圍
      .wheelDelta((event) => {
        // 調整滾輪靈敏度，讓縮放更平滑
        return -event.deltaY * 0.0015;
      })
      .on('zoom', (event) => {
        zoomContainer.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 初始化縮放和平移
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale));

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

    const linkPaths = linkGroup.selectAll('path')
      .data(data.links)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', d => d === selectedLink ? '#ff6b6b' : '#555')
      .attr('stroke-width', d => d === selectedLink ? 2.5 : 1.5)
      .attr('d', d => scd.calculatePathPoints(d, data.nodes))
      .attr('marker-end', d => {
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        return sourceNode && targetNode && sourceNode.x < targetNode.x ?
          'url(#arrow-up)' : 'url(#arrow-down)';
      });

    const linkLabels = linkGroup.selectAll<SVGGElement, Link>('g')
      .data(data.links)
      .enter()
      .append('g')
      .attr('class', 'link-label');

    linkLabels.append('rect')
      .attr('fill', 'white')
      .attr('opacity', 0.8)
      .attr('rx', 3);

    linkLabels.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', d => d === selectedLink ? '#ff6b6b' : '#555');

    const nodes = nodeGroup.selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .call(d3.drag<SVGGElement, Node>()
        .on('start', nodeDragStarted)
        .on('drag', nodeDragged)
        .on('end', nodeDragEnded)
      );

    nodes.append('rect')
      .attr('width', d => d.width || 240)
      .attr('height', d => d.height || 120)
      .attr('x', d => -(d.width || 240) / 2)
      .attr('y', d => -(d.height || 120) / 2)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', d => d === selectedNode ? '#ffd54f' : '#e0f7fa')
      .attr('stroke', '#333')
      .attr('stroke-width', 2.5);

    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '18px')
      .text(d => d.label);

    function nodeDragStarted(event: any) {
      d3.select(event.sourceEvent.target.parentNode).raise();
    }

    function nodeDragged(event: any, d: Node) {
      const newX = event.x;
      const newY = event.y;

      // 更新節點位置
      d.x = newX;
      d.y = newY;

      // 清除舊的輔助線
      svg.selectAll('.guideline').remove();
      svg.selectAll('.guideline-text').remove();

      // 顯示對齊輔助線
      showAlignmentGuides(d, newX, newY);

      // 更新整個圖形
      updateWholeGraph();
    }

    function showAlignmentGuides(node: Node, x: number, y: number) {
      let closestX: Node | null = null;
      let closestY: Node | null = null;
      let minDeltaX = Infinity;
      let minDeltaY = Infinity;

      data.nodes.forEach(other => {
        if (other.id === node.id) return;
        const dx = Math.abs(x - other.x);
        const dy = Math.abs(y - other.y);

        if (dx < minDeltaX) {
          minDeltaX = dx;
          closestX = other;
        }
        if (dy < minDeltaY) {
          minDeltaY = dy;
          closestY = other;
        }
      });

      if (closestX && minDeltaX < 50) {
        svg.append('line')
          .attr('class', 'guideline')
          .attr('x1', closestX.x)
          .attr('y1', 0)
          .attr('x2', closestX.x)
          .attr('y2', height)
          .attr('stroke', '#aaa')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '5,5');

        svg.append('text')
          .attr('class', 'guideline-text')
          .attr('x', (x + closestX.x) / 2)
          .attr('y', y)
          .attr('font-size', 12)
          .attr('fill', '#aaa')
          .text(`${Math.abs(x - closestX.x)}px`);
      }

      if (closestY && minDeltaY < 50) {
        svg.append('line')
          .attr('class', 'guideline')
          .attr('x1', 0)
          .attr('y1', closestY.y)
          .attr('x2', width)
          .attr('y2', closestY.y)
          .attr('stroke', '#aaa')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '5,5');

        svg.append('text')
          .attr('class', 'guideline-text')
          .attr('x', x)
          .attr('y', (y + closestY.y) / 2)
          .attr('font-size', 12)
          .attr('fill', '#aaa')
          .text(`${Math.abs(y - closestY.y)}px`);
      }
    }

    function nodeDragEnded() {
      // 清除輔助線
      svg.selectAll('.guideline').remove();
      svg.selectAll('.guideline-text').remove();
      
      // 確保最後一次更新
      updateWholeGraph();
    }

    function updateWholeGraph() {
      // 更新節點位置
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);

      // 更新節點外觀
      nodes.select('rect')
        .attr('fill', d => d === selectedNode ? '#ffd54f' : '#e0f7fa');

      // 重新計算並更新所有連線路徑
      linkPaths
        .attr('d', link => scd.calculatePathPoints(link, data.nodes))
        .attr('stroke', d => d === selectedLink ? '#ff6b6b' : '#555')
        .attr('stroke-width', d => d === selectedLink ? 2.5 : 1.5)
        .attr('marker-end', link => {
          const sourceNode = data.nodes.find(n => n.id === link.source);
          const targetNode = data.nodes.find(n => n.id === link.target);
          return sourceNode && targetNode && sourceNode.x < targetNode.x ?
            'url(#arrow-up)' : 'url(#arrow-down)';
        });

      // 更新連線標籤位置
      linkLabels.each(function(d) {
        if (!d.pathPoints) return;

        const labelGroup = d3.select(this);
        const text = labelGroup.select('text');
        const rect = labelGroup.select('rect');

        // 計算標籤位置
        const x = (d.pathPoints.sourceX + d.pathPoints.targetX) / 2;
        const y = d.pathPoints.midY1 - 15;

        // 設置文字位置
        text
          .attr('x', x)
          .attr('y', y)
          .attr('fill', d === selectedLink ? '#ff6b6b' : '#555');

        // 獲取文字的邊界框
        const bbox = text.node().getBBox();

        // 更新背景矩形
        rect
          .attr('x', x - bbox.width / 2 - 4)
          .attr('y', y - bbox.height / 2 - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);

        // 將整個組移動到正確位置
        labelGroup
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation();
            setSelectedLink(d);
            setSelectedNode(null);
            updateWholeGraph();
          });
      });
    }

    // 設置拖曳行為
    nodes.call(
      d3.drag<SVGGElement, Node>()
        .on('start', (event) => {
          d3.select(event.sourceEvent.target.parentNode).raise();
        })
        .on('drag', nodeDragged)
        .on('end', nodeDragEnded)
    );

    // 初始渲染
    updateWholeGraph();

    // 點擊事件處理
    nodes.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      setSelectedLink(null);
      updateWholeGraph();
    });

    linkPaths.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(null);
      setSelectedLink(d);
      updateWholeGraph();
    });

    svg.on('click', () => {
      setSelectedNode(null);
      setSelectedLink(null);
      updateWholeGraph();
    });

  }, [data, selectedNode, selectedLink, displayMode]);

  const generateTestData = () => {
    if (displayMode === 'graph') {
      const testData = scd.generateTestData();
      setInputText(JSON.stringify(testData, null, 2));
    } else {
      const mindMapTestData = MindMap.generateTestData();
      setInputText(JSON.stringify(mindMapTestData, null, 2));
    }
  };

  const ControlButtons = () => (
    <div className="flex space-x-4">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleGenerate}
      >
        生成{displayMode === 'graph' ? '系統圖' : '心智圖'}
      </button>
      <button
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={() => setIsDrawing(!isDrawing)}
      >
        {isDrawing ? '取消繪製' : '➕ 新增方塊'}
      </button>
      <button
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleDeleteNode}
        disabled={!selectedNode}
      >
        🗑️ 刪除選中方塊
      </button>  
      {selectedLink && (
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={handleDeleteLink}
        >
          🗑️ 刪除選中連線
        </button>
      )}
      <button
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        onClick={generateTestData}
      >
        生成測試資料
      </button>
      <button
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        onClick={() => setDisplayMode(prev => prev === 'graph' ? 'mindmap' : 'graph')}
      >
        切換至{displayMode === 'graph' ? '心智圖' : '系統圖'}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4" 
         style={{ 
           position: 'absolute',
           left: 0,
           right: 0,
           top: 0,
           bottom: 0,
           overflowY: 'auto'
         }}>
      <div className="w-3/4 mb-8">
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          style={{ height: '200px' }}
          placeholder="請貼上JSON內容 或點擊「生成測試資料」"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        ></textarea>
      </div>
      <ControlButtons />
      <div className="text-sm text-gray-500 mt-2 mb-8">
        {selectedNode && <p>✓ 已選中方塊: {selectedNode.label}</p>}
        {selectedLink && <p>✓ 已選中連線: {selectedLink.label}</p>}
        <p>💡 提示：連線也可拖曳調整垂直高度</p>
      </div>
      <div
        className="border-2 border-gray-300 rounded-lg bg-white shadow-md flex-none"
        style={{ 
          width: '1200px', 
          height: '800px'
        }}
      >
        <svg 
          ref={svgRef} 
          style={{ width: '100%', height: '100%', cursor: isDrawing ? 'crosshair' : 'default' }}
        />
      </div>
    </div>
  );
};

export const Graph = FreeContextDiagram;