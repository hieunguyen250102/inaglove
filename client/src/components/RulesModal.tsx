import { ChipFace } from '../art/Chip';
import { FigureFront } from '../art/Figure';
import { DiscovererMarker, UnseenMarker } from '../art/Markers';
import { Modal } from './Modal';

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <p className="eyebrow">In a Grove · bản Revised 2021</p>
      <h2 className="modal-title">Luật chơi</h2>
      <div className="rules">
        <section>
          <h3>Ai là hung thủ?</h3>
          <div className="rules-figs">
            {[3, 5, 8, 'X' as const].map((v) => (
              <span key={v} className="rules-fig">
                <FigureFront value={v} />
              </span>
            ))}
          </div>
          <ol>
            <li>Trong ba nghi phạm, <b>số lớn nhất</b> là hung thủ.</li>
            <li>
              Nếu trong ba nghi phạm có <b className="red">số 5</b>, thì <b>số nhỏ nhất</b> là hung thủ.
            </li>
            <li>
              Quân <b>X</b> luôn vô tội.
            </li>
          </ol>
        </section>
        <section>
          <h3>Chuẩn bị</h3>
          <ul>
            <li>2–3 người: dùng quân 2–8. 4 người: thêm một X. 5 người: thêm cả hai X.</li>
            <li>Mỗi người nhận 7 chip thám tử cùng màu và một quân úp. Bốn quân úp ở giữa: ba nghi phạm và một nạn nhân.</li>
            <li>2 người: quân còn lại được lật ngửa cho cả hai cùng thấy.</li>
          </ul>
        </section>
        <section>
          <h3>Kiểm tra ngoại phạm</h3>
          <p>
            Mỗi người xem quân của mình, chuyền sang phải và xem quân nhận được. Bạn biết hai số <b>không phải</b> nghi phạm.
          </p>
        </section>
        <section>
          <h3>Điều tra và buộc tội</h3>
          <div className="rules-row">
            <DiscovererMarker size={44} />
            <p>
              <b>Người đi đầu</b> xem 2 trong 3 nghi phạm; quân còn lại được đặt dấu
            </p>
            <UnseenMarker size={44} />
            <p>
              <b>Chưa xem</b>.
            </p>
          </div>
          <ul>
            <li>Sau đó, theo chiều kim đồng hồ, mỗi người xem hai nghi phạm, trừ nghi phạm mà người ngay trước vừa buộc tội.</li>
            <li>
              Đặt một chip thám tử dưới nghi phạm bạn cho là hung thủ, kể cả nghi phạm bạn chưa xem. Nếu đã có chip, đặt chồng lên trên.
              Đôi khi tố cáo lừa lại hay hơn!
            </li>
          </ul>
        </section>
        <section>
          <h3>Lật mặt sự thật</h3>
          <div className="rules-row">
            <span className="chip-md">
              <ChipFace color="green" />
            </span>
            <p>Chip đặt dưới hung thủ bị <b>loại khỏi ván</b>, không quay về tay.</p>
            <span className="chip-md">
              <ChipFace color="green" side="back" />
            </span>
            <p>
              Ở mỗi nghi phạm vô tội, người có chip <b>trên cùng</b> nhận cả chồng, lật sang mặt <b>phạt (!)</b>.
            </p>
          </div>
        </section>
        <section>
          <h3>Kết thúc</h3>
          <ul>
            <li>Người nhiều chip phạt nhất đi đầu ở vụ án tiếp theo.</li>
            <li>
              Ván dừng sau vụ án khiến ai đó có <b>từ 5 chip phạt</b> hoặc có người <b>hết chip thám tử</b>, tối đa 7 vụ án.
            </li>
            <li>Người nhiều chip phạt nhất thua. Nếu hoà, người buộc tội sớm hơn ở vụ cuối thua.</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
