export function DataCollectionNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <div className={`p-3 rounded-lg bg-gray-900 border shadow-md ${
      selected ? 'border-primary-500' : 'border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="bg-pink-600 text-white text-xs px-2 py-0.5 rounded">Сбор данных</span>
      </div>
      <div className="text-sm font-medium">{data.label || 'Сбор данных'}</div>
      {data.description && (
        <div className="text-xs text-gray-400 mt-1">{data.description}</div>
      )}
    </div>
  );
}