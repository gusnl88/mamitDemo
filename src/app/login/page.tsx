"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { DEMO_ACCOUNTS, DEMO_OTP_CODE } from "@/lib/mock/seed";
import type { Role } from "@/types/auth";

const REMEMBERED_EMAIL_KEY = "mamit-remembered-email";

interface EmailStepValues {
  email: string;
  rememberEmail: boolean;
}

interface CodeStepValues {
  code: string;
}

interface LoginRequestResult {
  email: string;
  expiresInSeconds: number;
}

interface VerifyLoginResult {
  id: number;
  token: string;
  refreshToken: string;
  name: string;
  role: Role;
}

const formatCountdown = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [emailForm] = Form.useForm<EmailStepValues>();
  const [codeForm] = Form.useForm<CodeStepValues>();

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      emailForm.setFieldsValue({ email: remembered, rememberEmail: true });
    }
  }, [emailForm]);

  // 만료 시각(expiresAt)이 정해지면 1초마다 남은 시간을 갱신 — 초기값은 이걸
  // 트리거한 이벤트 핸들러에서 이미 세팅해두므로, 여기선 구독(타이머)만 건다.
  useEffect(() => {
    if (expiresAt === null) return;

    const timer = setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const requestVerificationCode = async (targetEmail: string) => {
    const { data } = await apiClient.post<LoginRequestResult>("/auth/login", {
      email: targetEmail,
    });
    setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
    setRemainingSeconds(data.expiresInSeconds);
  };

  const handleEmailSubmit = async (values: EmailStepValues) => {
    setRequesting(true);
    try {
      await requestVerificationCode(values.email);

      if (values.rememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      setEmail(values.email);
      setStep("code");
    } catch {
      // 인터셉터가 이미 에러 메시지를 표시함
    } finally {
      setRequesting(false);
    }
  };

  const handleCodeSubmit = async (values: CodeStepValues) => {
    setVerifying(true);
    try {
      const { data } = await apiClient.post<VerifyLoginResult>("/auth/verify-login", {
        email,
        code: values.code,
      });
      setAuth(data.token, data.refreshToken, { id: data.id, name: data.name, role: data.role });
      router.replace("/dashboard");
    } catch {
      // 인터셉터가 이미 에러 메시지를 표시함
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await requestVerificationCode(email);
    } catch {
      // 인터셉터가 이미 에러 메시지를 표시함
    } finally {
      setResending(false);
    }
  };

  const handleBackToEmail = () => {
    codeForm.resetFields();
    setExpiresAt(null);
    setRemainingSeconds(0);
    setStep("email");
  };

  const expired = remainingSeconds <= 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Image src="/brand/logo-mark.png" alt="Mamit Admin" width={56} height={56} priority />
        </div>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 4 }}>
          Mamit Admin
        </Typography.Title>
        <Typography.Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          관리자 로그인
        </Typography.Text>

        {step === "email" ? (
          <Form<EmailStepValues>
            form={emailForm}
            layout="vertical"
            onFinish={handleEmailSubmit}
            autoComplete="off"
            initialValues={{ rememberEmail: false }}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="데모 환경 안내"
              description={
                <>
                  실제 이메일 발송 없이 인증 코드는 항상 <strong>{DEMO_OTP_CODE}</strong>입니다.
                  아래 계정으로 로그인하면 역할별 화면 차이를 확인할 수 있어요.
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {DEMO_ACCOUNTS.map((account) => (
                      <li key={account.email}>
                        {account.name}: <strong>{account.email}</strong>
                      </li>
                    ))}
                  </ul>
                  다른 이메일을 입력해도 총괄관리자 권한으로 로그인됩니다.
                </>
              }
            />
            <Form.Item
              name="email"
              label="이메일"
              rules={[{ required: true, type: "email", message: "이메일을 입력해 주세요." }]}
            >
              <Input prefix={<MailOutlined />} placeholder="이메일" size="large" />
            </Form.Item>
            <Form.Item name="rememberEmail" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>이메일 저장</Checkbox>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={requesting}>
                인증 코드 받기
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form<CodeStepValues>
            form={codeForm}
            layout="vertical"
            onFinish={handleCodeSubmit}
            autoComplete="off"
          >
            <Typography.Paragraph style={{ textAlign: "center", marginBottom: 16 }}>
              <strong>{email}</strong>로 인증 코드를 보냈습니다.
              <br />
              (데모 환경: 인증 코드는 항상 <strong>{DEMO_OTP_CODE}</strong>입니다)
              <br />
              {expired ? (
                <span style={{ color: "#ff4d4f" }}>
                  인증 코드가 만료되었습니다.
                  <br />
                  다시 받기를 눌러주세요.
                </span>
              ) : (
                <>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCountdown(remainingSeconds)}
                  </span>{" "}
                  이내에 입력해주세요.
                </>
              )}
            </Typography.Paragraph>
            <Form.Item
              name="code"
              label="인증 코드"
              rules={[
                { required: true, message: "인증 코드를 입력해 주세요." },
                { len: 6, message: "6자리를 모두 입력해 주세요." },
              ]}
            >
              <Input.OTP
                length={6}
                size="large"
                formatter={(value) => value.replace(/[^\d]/g, "")}
                disabled={expired}
                style={{ width: "100%", justifyContent: "space-between" }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={verifying}
                disabled={expired}
              >
                로그인
              </Button>
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="link" style={{ padding: 0 }} onClick={handleBackToEmail}>
                이메일 다시 입력
              </Button>
              <Button type="link" style={{ padding: 0 }} loading={resending} onClick={handleResend}>
                다시 받기
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
