// 事务总线
import mitt from 'mitt'

// const emitter: Emitter<MittType> = mitt<MittType>();
const emitter = mitt()

// 监听所有事件
emitter.on('*', (t: any, o: any) => {
  console.log(`* 监听到的事件类型是: ${t}, 接收的参数为: `, o)
})

// 取消所有的 mitt 事件
// emitter.all.clear()
// 注册并监听自定义事件
// emitter.on(eventType,callback)
// 触发自定义事件
// emitter.emit(eventType,params)
// 取消事件
// emitter.off(eventType,callback)

export const useBus = () => ({ bus: emitter })
export default emitter
