"use client";

import { App, Button, DatePicker, Form, Image, Input, InputNumber, Modal, Select, Space, Upload } from "antd";
import type { FormInstance } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { CATEGORY_OPTIONS, type BannerCategory, type BannerPeriod } from "@/components/banners/banner";

/** 새로 고른 파일이면 `file`이 있고, 수정 화면에서 기존 이미지를 그대로 두면 `previewUrl`만 있다. */
export interface BannerImageValue {
  file?: File;
  previewUrl: string;
}

export interface BannerFormValues {
  category: BannerCategory;
  title: string;
  description?: string;
  targetUrl?: string;
  /** 등록 때만 받는다 — 이후 순서는 목록의 위/아래 버튼으로 바꾼다. */
  displayOrder?: number;
  period?: BannerPeriod;
  image: BannerImageValue;
}

// ImageService 의 배너 이미지 제한과 같게 맞춘다 (jpeg/png/gif/webp, 10MB).
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function BannerImageInput({
  value,
  onChange,
}: {
  value?: BannerImageValue;
  onChange?: (value: BannerImageValue) => void;
}) {
  const { message } = App.useApp();

  return (
    <Space align="start">
      <Upload
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        showUploadList={false}
        beforeUpload={(file) => {
          if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            message.error("JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.");
            return Upload.LIST_IGNORE;
          }
          if (file.size > MAX_IMAGE_BYTES) {
            message.error("이미지는 10MB 이하만 업로드할 수 있습니다.");
            return Upload.LIST_IGNORE;
          }
          // 실제 업로드는 저장할 때 배너 API(/with-image)로 같이 보낸다.
          onChange?.({ file, previewUrl: URL.createObjectURL(file) });
          return false;
        }}
      >
        <Button icon={<UploadOutlined />}>{value ? "이미지 변경" : "이미지 선택"}</Button>
      </Upload>
      {value && <Image src={value.previewUrl} alt="배너 미리보기" width={120} />}
    </Space>
  );
}

interface BannerFormModalProps {
  mode: "create" | "edit";
  open: boolean;
  form: FormInstance<BannerFormValues>;
  onOk: () => void;
  onCancel: () => void;
  confirmLoading: boolean;
  /** 모달이 열릴 때 Form 이 새로 만들어지므로(destroyOnHidden) 기존 값은 setFieldsValue 가 아니라 이걸로 넘긴다. */
  initialValues?: Partial<BannerFormValues>;
  onValuesChange?: (changed: Partial<BannerFormValues>) => void;
}

/** 배너 등록/수정 모달 — 수정은 카테고리를 바꿀 수 없고(백엔드 미지원) 순서 입력이 없다. */
export function BannerFormModal({
  mode,
  open,
  form,
  onOk,
  onCancel,
  confirmLoading,
  initialValues,
  onValuesChange,
}: BannerFormModalProps) {
  const isCreate = mode === "create";

  return (
    <Modal
      title={isCreate ? "배너 등록" : "배너 수정"}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText={isCreate ? "등록" : "저장"}
      cancelText="취소"
    >
      <Form<BannerFormValues>
        form={form}
        layout="vertical"
        // 모달이 닫히면(destroyOnHidden) 입력값도 버린다 — 다음 등록 때 이전 값·이미지가 남지 않게.
        preserve={false}
        initialValues={initialValues}
        onValuesChange={(changed) => onValuesChange?.(changed)}
      >
        <Form.Item
          name="category"
          label="카테고리"
          rules={[{ required: true, message: "카테고리를 선택해 주세요." }]}
          extra={isCreate ? undefined : "카테고리는 등록 후 변경할 수 없습니다."}
        >
          <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} disabled={!isCreate} />
        </Form.Item>
        <Form.Item
          name="title"
          label="타이틀"
          rules={[{ required: true, message: "타이틀을 입력해 주세요." }, { max: 100 }]}
        >
          <Input placeholder="타이틀" />
        </Form.Item>
        <Form.Item name="description" label="설명" rules={[{ max: 500 }]}>
          <Input.TextArea placeholder="설명 (선택)" rows={2} />
        </Form.Item>
        <Form.Item
          name="image"
          label="이미지"
          rules={[{ required: true, message: "배너 이미지를 선택해 주세요." }]}
        >
          <BannerImageInput />
        </Form.Item>
        <Form.Item
          name="targetUrl"
          label="연결 링크"
          rules={[{ type: "url", message: "올바른 URL을 입력해 주세요." }, { max: 1000 }]}
        >
          <Input placeholder="https://..." autoComplete="off" />
        </Form.Item>
        {isCreate && (
          <Form.Item
            name="displayOrder"
            label="노출순서"
            rules={[{ required: true, message: "노출순서를 입력해 주세요." }]}
            extra="같은 카테고리 안에서 겹치지 않아야 합니다. 카테고리를 고르면 다음 순서가 자동으로 채워집니다."
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        )}
        <Form.Item name="period" label="노출기간" extra="비워두면 즉시 시작 · 무기한으로 노출됩니다.">
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            allowEmpty={[true, true]}
            placeholder={["즉시 시작", "무기한"]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
