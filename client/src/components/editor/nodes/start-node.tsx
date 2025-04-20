export function StartNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <div className={`p-3 rounded-lg bg-gray-900 border shadow-md ${
      selected ? 'border-primary-500' : 'border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded">Старт</span>
      </div>
      <div className="text-sm">{data.label || 'Начало цепочки'}</div>
    </div>
  );
}