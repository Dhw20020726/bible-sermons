import {translate} from '@docusaurus/Translate';

const translations = {
  button: {
    buttonText: translate({
      id: 'theme.SearchBar.label',
      message: '搜索',
      description: 'The ARIA label and placeholder for search button',
    }),
    buttonAriaLabel: translate({
      id: 'theme.SearchBar.label',
      message: '搜索',
      description: 'The ARIA label and placeholder for search button',
    }),
  },
  modal: {
    searchBox: {
      resetButtonTitle: translate({
        id: 'theme.SearchModal.searchBox.resetButtonTitle',
        message: '清除搜索词',
        description: 'The label and ARIA label for search box reset button',
      }),
      resetButtonAriaLabel: translate({
        id: 'theme.SearchModal.searchBox.resetButtonTitle',
        message: '清除搜索词',
        description: 'The label and ARIA label for search box reset button',
      }),
      cancelButtonText: translate({
        id: 'theme.SearchModal.searchBox.cancelButtonText',
        message: '取消',
        description: 'The label and ARIA label for search box cancel button',
      }),
      cancelButtonAriaLabel: translate({
        id: 'theme.SearchModal.searchBox.cancelButtonText',
        message: '取消',
        description: 'The label and ARIA label for search box cancel button',
      }),
      clearButtonTitle: translate({
        id: 'theme.SearchModal.searchBox.resetButtonTitle',
        message: '清除搜索词',
        description: 'The label and ARIA label for search box reset button',
      }),
      clearButtonAriaLabel: translate({
        id: 'theme.SearchModal.searchBox.resetButtonTitle',
        message: '清除搜索词',
        description: 'The label and ARIA label for search box reset button',
      }),
      closeButtonText: translate({
        id: 'theme.SearchModal.searchBox.cancelButtonText',
        message: '取消',
        description: 'The label and ARIA label for search box cancel button',
      }),
      closeButtonAriaLabel: translate({
        id: 'theme.SearchModal.searchBox.cancelButtonText',
        message: '取消',
        description: 'The label and ARIA label for search box cancel button',
      }),
      placeholderText: translate({
        id: 'theme.SearchModal.searchBox.placeholderText',
        message: '搜索文档',
        description: 'The placeholder text for the main search input field',
      }),
      placeholderTextAskAi: translate({
        id: 'theme.SearchModal.searchBox.placeholderTextAskAi',
        message: '继续向 AI 提问…',
        description: 'The placeholder text when in AI question mode',
      }),
      placeholderTextAskAiStreaming: translate({
        id: 'theme.SearchModal.searchBox.placeholderTextAskAiStreaming',
        message: '正在回答…',
        description:
          'The placeholder text for search box when AI is streaming an answer',
      }),
      enterKeyHint: translate({
        id: 'theme.SearchModal.searchBox.enterKeyHint',
        message: '搜索',
        description: 'The hint for the search box enter key text',
      }),
      enterKeyHintAskAi: translate({
        id: 'theme.SearchModal.searchBox.enterKeyHintAskAi',
        message: '回车',
        description: 'The hint for the Ask AI search box enter key text',
      }),
      searchInputLabel: translate({
        id: 'theme.SearchModal.searchBox.searchInputLabel',
        message: '搜索',
        description: 'The ARIA label for search input',
      }),
      backToKeywordSearchButtonText: translate({
        id: 'theme.SearchModal.searchBox.backToKeywordSearchButtonText',
        message: '回到关键词搜索',
        description: 'The text for back to keyword search button',
      }),
      backToKeywordSearchButtonAriaLabel: translate({
        id: 'theme.SearchModal.searchBox.backToKeywordSearchButtonAriaLabel',
        message: '回到关键词搜索',
        description: 'The ARIA label for back to keyword search button',
      }),
    },
    startScreen: {
      recentSearchesTitle: translate({
        id: 'theme.SearchModal.startScreen.recentSearchesTitle',
        message: '最近搜索',
        description: 'The title for recent searches',
      }),
      noRecentSearchesText: translate({
        id: 'theme.SearchModal.startScreen.noRecentSearchesText',
        message: '暂无最近搜索',
        description: 'The text when there are no recent searches',
      }),
      saveRecentSearchButtonTitle: translate({
        id: 'theme.SearchModal.startScreen.saveRecentSearchButtonTitle',
        message: '保存此搜索',
        description: 'The title for save recent search button',
      }),
      removeRecentSearchButtonTitle: translate({
        id: 'theme.SearchModal.startScreen.removeRecentSearchButtonTitle',
        message: '从历史中移除此搜索',
        description: 'The title for remove recent search button',
      }),
      favoriteSearchesTitle: translate({
        id: 'theme.SearchModal.startScreen.favoriteSearchesTitle',
        message: '收藏',
        description: 'The title for favorite searches',
      }),
      removeFavoriteSearchButtonTitle: translate({
        id: 'theme.SearchModal.startScreen.removeFavoriteSearchButtonTitle',
        message: '从收藏中移除此搜索',
        description: 'The title for remove favorite search button',
      }),
      recentConversationsTitle: translate({
        id: 'theme.SearchModal.startScreen.recentConversationsTitle',
        message: '最近会话',
        description: 'The title for recent conversations',
      }),
      removeRecentConversationButtonTitle: translate({
        id: 'theme.SearchModal.startScreen.removeRecentConversationButtonTitle',
        message: '从历史中移除此会话',
        description: 'The title for remove recent conversation button',
      }),
    },
    errorScreen: {
      titleText: translate({
        id: 'theme.SearchModal.errorScreen.titleText',
        message: '无法获取结果',
        description: 'The title for error screen',
      }),
      helpText: translate({
        id: 'theme.SearchModal.errorScreen.helpText',
        message: '请检查你的网络连接。',
        description: 'The help text for error screen',
      }),
    },
    resultsScreen: {
      askAiPlaceholder: translate({
        id: 'theme.SearchModal.resultsScreen.askAiPlaceholder',
        message: '向 AI 询问：',
        description: 'The placeholder text for Ask AI input',
      }),
    },
    askAiScreen: {
      disclaimerText: translate({
        id: 'theme.SearchModal.askAiScreen.disclaimerText',
        message: 'AI 生成的回答可能有误，请自行查证。',
        description: 'The disclaimer text for AI answers',
      }),
      relatedSourcesText: translate({
        id: 'theme.SearchModal.askAiScreen.relatedSourcesText',
        message: '相关来源',
        description: 'The text for related sources',
      }),
      thinkingText: translate({
        id: 'theme.SearchModal.askAiScreen.thinkingText',
        message: '思考中…',
        description: 'The text when AI is thinking',
      }),
      copyButtonText: translate({
        id: 'theme.SearchModal.askAiScreen.copyButtonText',
        message: '复制',
        description: 'The text for copy button',
      }),
      copyButtonCopiedText: translate({
        id: 'theme.SearchModal.askAiScreen.copyButtonCopiedText',
        message: '已复制！',
        description: 'The text for copy button when copied',
      }),
      copyButtonTitle: translate({
        id: 'theme.SearchModal.askAiScreen.copyButtonTitle',
        message: '复制回答',
        description: 'The title for copy button',
      }),
      sourcesTitle: translate({
        id: 'theme.SearchModal.askAiScreen.sourcesTitle',
        message: '来源',
        description: 'The title for sources section',
      }),
      clearButtonText: translate({
        id: 'theme.SearchModal.askAiScreen.clearButtonText',
        message: '清除',
        description: 'The text for clear button',
      }),
      clearButtonAriaLabel: translate({
        id: 'theme.SearchModal.askAiScreen.clearButtonText',
        message: '清除',
        description: 'The aria-label for clear button',
      }),
      stopButtonText: translate({
        id: 'theme.SearchModal.askAiScreen.stopButtonText',
        message: '停止',
        description: 'The text for stop button',
      }),
      stopButtonAriaLabel: translate({
        id: 'theme.SearchModal.askAiScreen.stopButtonText',
        message: '停止',
        description: 'The aria-label for stop button',
      }),
      continueButtonText: translate({
        id: 'theme.SearchModal.askAiScreen.continueButtonText',
        message: '继续',
        description: 'The text for continue button',
      }),
      continueButtonAriaLabel: translate({
        id: 'theme.SearchModal.askAiScreen.continueButtonText',
        message: '继续',
        description: 'The aria-label for continue button',
      }),
      responseLegitimacyExplanation: translate({
        id: 'theme.SearchModal.askAiScreen.responseLegitimacyExplanation',
        message: '回答由 AI 生成，仅供参考。',
        description:
          'Explain that the AI-generated responses may be of questionable legitimacy',
      }),
    },
    noResultsScreen: {
      noResultsText: translate({
        id: 'theme.SearchModal.noResultsScreen.noResultsText',
        message: '没有找到结果',
        description: 'The text for no results screen',
      }),
      suggestedQueryText: translate({
        id: 'theme.SearchModal.noResultsScreen.suggestedQueryText',
        message: '试试搜索',
        description: 'The text for suggested query',
      }),
      reportMissingResultsText: translate({
        id: 'theme.SearchModal.noResultsScreen.reportMissingResultsText',
        message: '你认为应该有结果吗？',
        description: 'The text for reporting missing results',
      }),
      reportMissingResultsLinkText: translate({
        id: 'theme.SearchModal.noResultsScreen.reportMissingResultsLinkText',
        message: '向我们反馈',
        description: 'The text for the feedback link',
      }),
    },
  },
};

export default translations;
