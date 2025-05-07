import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// 读取文件
const filePath = path.join(__dirname, 'src', 'components', 'Demo3.vue');
let content = fs.readFileSync(filePath, 'utf8');

// 查找第二个loadModel函数的位置
const searchPattern = '// 修改原来的loadModel函数调用新的loadSpecificModel函数';
const startIndex = content.indexOf(searchPattern);

if (startIndex !== -1) {
    // 确认找到的区域
    console.log('找到了重复函数声明，位置在字符索引:', startIndex);
    console.log('匹配到的内容前50个字符:', content.substring(startIndex, startIndex + 50));

    // 查找函数结束位置
    const endIndex = content.indexOf('};', startIndex) + 2;
    console.log('函数结束位置:', endIndex);
    console.log('要删除的完整内容:', content.substring(startIndex, endIndex));

    // 删除重复的函数声明
    const newContent = content.substring(0, startIndex) + content.substring(endIndex);

    // 写入修改后的文件
    fs.writeFileSync(filePath, newContent, 'utf8');

    console.log('成功删除重复的loadModel函数');
} else {
    console.log('未找到需要删除的重复函数');
}