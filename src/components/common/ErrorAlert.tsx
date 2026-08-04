import { Alert, Button } from "antd";

export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

/** 데이터 조회 실패 시 쓰는 표준 인라인 에러 배너, 재시도 액션은 선택 사항. */
export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      style={{ marginBottom: 16 }}
      action={
        onRetry && (
          <Button size="small" danger onClick={onRetry}>
            다시 시도
          </Button>
        )
      }
    />
  );
}
