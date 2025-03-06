// プラグインレジストリ
class PluginRegistry {
  constructor() {
    this.plugins = {};
    this.hooks = {
      // メニュー拡張用のフック
      'menu:extend': [],
      // ツールバー拡張用のフック
      'toolbar:extend': [],
      // セル表示をカスタマイズするフック
      'cell:render': [],
      // コンテキストメニュー拡張用のフック
      'contextmenu:extend': [],
      // データ処理前後のフック
      'data:beforeChange': [],
      'data:afterChange': [],
      // その他必要なフック
    };
  }

  // プラグインを登録
  register(pluginId, pluginDefinition) {
    if (this.plugins[pluginId]) {
      console.warn(`Plugin ${pluginId} is already registered.`);
      return false;
    }

    this.plugins[pluginId] = {
      id: pluginId,
      name: pluginDefinition.name || pluginId,
      version: pluginDefinition.version || '1.0.0',
      author: pluginDefinition.author || 'Unknown',
      enabled: false,
      definition: pluginDefinition
    };

    return true;
  }

  // プラグインを有効化
  enable(pluginId) {
    const plugin = this.plugins[pluginId];
    if (!plugin) return false;

    // 既に有効な場合は何もしない
    if (plugin.enabled) return true;

    // プラグインの初期化
    if (typeof plugin.definition.initialize === 'function') {
      try {
        plugin.definition.initialize(this);
        
        // フックに登録
        if (plugin.definition.hooks) {
          Object.entries(plugin.definition.hooks).forEach(([hookName, handler]) => {
            if (this.hooks[hookName]) {
              this.hooks[hookName].push({
                pluginId,
                handler
              });
            }
          });
        }
        
        plugin.enabled = true;
        return true;
      } catch (error) {
        console.error(`Failed to initialize plugin ${pluginId}:`, error);
        return false;
      }
    }
    
    return false;
  }

  // プラグインを無効化
  disable(pluginId) {
    const plugin = this.plugins[pluginId];
    if (!plugin || !plugin.enabled) return false;

    // プラグインの後処理
    if (typeof plugin.definition.cleanup === 'function') {
      try {
        plugin.definition.cleanup();
      } catch (error) {
        console.error(`Error during plugin ${pluginId} cleanup:`, error);
      }
    }

    // フックから削除
    Object.keys(this.hooks).forEach(hookName => {
      this.hooks[hookName] = this.hooks[hookName].filter(
        hook => hook.pluginId !== pluginId
      );
    });

    plugin.enabled = false;
    return true;
  }

  // フックを実行
  runHook(hookName, ...args) {
    if (!this.hooks[hookName]) return null;

    let results = [];
    for (const { handler } of this.hooks[hookName]) {
      try {
        const result = handler(...args);
        if (result !== undefined) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error running hook ${hookName}:`, error);
      }
    }

    return results.length > 0 ? results : null;
  }

  // 全プラグインのリストを取得
  getPlugins() {
    return Object.values(this.plugins);
  }
}

export default new PluginRegistry();