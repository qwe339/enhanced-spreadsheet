import pluginRegistry from './plugin-registry';

// コアプラグインをインポート
import chartPlugin from './core/chart-plugin';
import conditionalFormatPlugin from './core/conditional-format';
import dataValidationPlugin from './core/data-validation';

// プラグインを登録
pluginRegistry.register('chart', chartPlugin);
pluginRegistry.register('conditional-format', conditionalFormatPlugin);
pluginRegistry.register('data-validation', dataValidationPlugin);

// デフォルトで有効化するプラグイン
pluginRegistry.enable('chart');
pluginRegistry.enable('conditional-format');
pluginRegistry.enable('data-validation');

export default pluginRegistry;