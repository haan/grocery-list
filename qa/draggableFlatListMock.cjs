// Native gesture/animation boundary for screen tests. The app's drop handler
// and store remain real; tests explicitly supply the native drop event.
const React = require('react');
const { FlatList } = require('react-native');
let latest;
module.exports = {
  __esModule: true,
  getProps: () => latest,
  default: function DraggableFlatListMock(props) {
    latest = props;
    return React.createElement(FlatList, {
      ...props,
      renderItem: ({item, index}) => props.renderItem({
        item, getIndex: () => index, isActive: false,
        drag: () => props.onDragBegin?.(index),
      }),
    });
  },
};
