import { Component } from 'react';

/** Keep an optional OCR chunk failure from unmounting the existing trading screen. */
export default class PanelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert" className="ocr-error">용어 분석 도구를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요. 현재 페이지는 계속 사용할 수 있습니다.</p>
      : this.props.children;
  }
}
