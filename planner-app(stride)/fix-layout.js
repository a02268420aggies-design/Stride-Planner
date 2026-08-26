const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace the ReorderableListItem structure to move the drag handle left and fix inner wrapper
content = content.replace(
  /<div className="flex-1 min-w-0">\s*\{children\}\s*<\/div>\s*<div\s*draggable=\{false\}/m,
  '<div\n        draggable={false}'
);

content = content.replace(
  /<GripVertical className="w-4 h-4 text-zinc-400" \/>\s*<\/div>/m,
  '<GripVertical className="w-4 h-4 text-zinc-400" />\n      </div>\n      <div className="flex-1 min-w-0 flex items-center gap-3 h-full">\n        {children}\n      </div>'
);

fs.writeFileSync('src/app/page.tsx', content, 'utf8');
console.log('Replacement done');
