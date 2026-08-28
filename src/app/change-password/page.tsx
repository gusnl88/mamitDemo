"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { ApiError } from "@/types/api";
import type { AuthUser } from "@/types/auth";

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResult {
  accessToken: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  permissions: string[];
  mustChangePassword: boolean;
}

/**
 * 임시 비밀번호 상태(mustChangePassword=true)에서 강제로 거치는 화면.
 * AuthGuard가 이 상태면 다른 화면으로 못 가게 막는다.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form] = Form.useForm<ChangePasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/login");
    } else if (user && !user.mustChangePassword) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, token, user, router]);

  if (!hasHydrated || !token || (user && !user.mustChangePassword)) {
    return <LoadingScreen />;
  }

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitting(true);
    try {
      // 데모에는 실제 비밀번호 저장소가 없어 email로 계정을 식별시킨다 —
      // 실제 서버는 JWT로 식별하므로 이 필드는 보내지 않는다.
      const { data } = await apiClient.post<ChangePasswordResult>("/auth/change-password", {
        email: user?.email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setAuth(data.accessToken, {
        email: data.email,
        name: data.name,
        role: data.role,
        permissions: data.permissions,
        mustChangePassword: data.mustChangePassword,
      });
      router.replace("/dashboard");
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // 인터셉터가 이미 에러 메시지를 표시함
    } finally {
      setSubmitting(false);
    }
  };

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
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 4 }}>
          비밀번호 변경
        </Typography.Title>
        <Typography.Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          임시 비밀번호는 최초 1회 반드시 변경해야 합니다.
        </Typography.Text>

        <Form<ChangePasswordFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="currentPassword"
            label="임시 비밀번호"
            rules={[{ required: true, message: "현재 비밀번호를 입력해 주세요." }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="현재 비밀번호" size="large" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="새 비밀번호"
            extra="8자 이상, 영문과 숫자를 함께 사용해 주세요."
            rules={[
              { required: true, message: "새 비밀번호를 입력해 주세요." },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d)[\w!@#$%^&*()\-+=[\]{};':"\\|,.<>/?]{8,}$/,
                message: "8자 이상, 영문과 숫자를 함께 사용해 주세요.",
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="새 비밀번호 확인"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "새 비밀번호를 한 번 더 입력해 주세요." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("새 비밀번호가 일치하지 않습니다."));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호 확인" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              변경하고 계속하기
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
