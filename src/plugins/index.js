import pluginRegistry from './plugin-registry';

// コアプラグインをインポート
import chartPlugin from './core/chart-plugin';
import conditionalFormatPlugin from './core/conditional-format';
import dataValidationPlugin from './core/data-validation';
import fileOperationsPlugin from './core/file-operations';
import formattingPlugin from './core/formatting';
import helpPlugin from './core/help';

// プラグインを登録
pluginRegistry.register('chart', chartPlugin);
pluginRegistry.register('conditional-format', conditionalFormatPlugin);
pluginRegistry.register('data-validation', dataValidationPlugin);
pluginRegistry.register('file-operations', fileOperationsPlugin);
pluginRegistry.register('formatting', formattingPlugin);
pluginRegistry.register('help', helpPlugin);

// デフォルトで有効化するプラグイン
pluginRegistry.enable('chart');
pluginRegistry.enable('conditional-format');
pluginRegistry.enable('data-validation');
pluginRegistry.enable('file-operations');
pluginRegistry.enable('formatting');
pluginRegistry.enable('help');

export default pluginRegistry;