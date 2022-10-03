import { useEffect, useState, Fragment, useMemo } from 'react';
import { useWeb3React } from '@web3-react/core';
import SetToken_ABI from '../../constants/abis/SetToken.json';
import RSetToken_ABI from '../../constants/abis/RebalancingSetTokenV2.json';
import _ from "lodash";
import { loadContract } from '../../utils';
import { BigNumber } from "@0x/utils";
import Web3 from "web3";
import { config } from "../../constants/spot-config/mainnet/config";
import {
  CHANGE_NOW_FLOW, SIDE_SHIFT_TYPE, supportedDEXes, SIMPLE_SWAP_FIXED, DEXesImages,
  ZERO, PARASWAP_REFERRER_ACCOUNT, networks_dict
} from "../../constants";
import InstantSwapApi from "../../http/instantSwap";
import CoinModal from "./CoinModal";
import SwapCard from "./SwapCard";
import { useToasts } from 'react-toast-notifications';
import Load from '../GeneralComponents/Load';
import { ERC20_ABI } from '../../constants/abis/erc20';
import ConfModal from './ConfModal';
// import SwapSettings from '../SwapingComponents/SwapSettings';
// import TablePaginationDemo from '../GeneralComponents/TablePaginationDemo';
import { Modal } from "react-bootstrap";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import ModalConnect from '../GeneralComponents/ModalConnect';
import { getTokenPrice, getTokenPriceByAddress } from '../../utils';
import { buySetToken } from "../../hooks/buySetToken";
import { sellSetToken } from "../../hooks/sellSetToken";
import {getCoinBalance} from "../../hooks/loadBalance";

function BuySellModal({ show1, setShow1, token }: any) {

  const { active, account, library } = useWeb3React();
  const [show, setShow] = useState(false);
  const [currShow, setCurrShow] = useState(false);
  const [side, setSide] = useState("");
  const [from, setFrom]: any = useState(token);
  const [buySell, setBuySell] = useState('Buy');
  const [to, setTo]: any = useState({ ...config.walletTokens[2], value: 0, max: 0 });
  const [com_addresses, setComAddressses] = useState<Array<string>>();
  const [com_quantities, setComQuantities] = useState<Array<BigNumber>>();
  const [need_quantities, setNeedQuantities] = useState<Array<BigNumber>>();


  // console.log(SetJsInstance);

  // console.log("from token: ", token);
  const [trNumber, setTrNumber] = useState(0);
  const [loading, setLoading] = useState({
    all: 28,
    loaded: 0
  });
  const [fetchloading, setFetchLoading] = useState(false);
  const [result, setResult]: any = useState(null);
  const { addToast } = useToasts();
  const api: any = InstantSwapApi;
  const [tokens, setTokens] = useState([...config.walletTokens])
  const [fromMax, setFromMax] = useState(0);
  const [toMax, setToMax] = useState(0)
  const [fromBalance, setFromBalance] = useState(0);
  const [toBalance, setToBalance] = useState(0);

  const [priceInterval, setPriceInterval]: any = useState(null);
  const [selectedRate, setSelectedRate]: any = useState(null);
  const [selectedBuyRate, setSelectedBuyRate]: any = useState(null);
  const [BuyState, setBuyState] = useState("");
  const [BuySellState, setBuySellState] = useState("");

  const [openSettings, setOpenSettings] = useState(false)
  const [slippage, setSlippage] = useState(1);
  const [speed, setSpeed] = useState("Standard");
  const [unlimited, setUnlimited] = useState(false);
  const [swapData, setSwapData] = useState({
    show: false,
    platform: "",
    id: "",
    address: ""
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const isInsufficient = useMemo(() => {
    if (!from) return false;
    if (buySell === 'Buy') {
      // console.log("toMax: ",toMax, toBalance);
      return Number(toMax) > new BigNumber(toBalance).div(10 ** to.decimals).toNumber();
    }
    return Number(fromMax) > new BigNumber(fromBalance).div(10 ** 18).toNumber();
  }, [fromMax, fromBalance, toMax, toBalance, buySell])
  const onChangeBalance = (balance: any, side: any) => {
    if (side === "from" && from) {
      setFromBalance(balance);
    } else if (side === "to" && to) {
      setToBalance(balance);
    }
  };

  async function switchHandler() {
    let temp;
    let temp2;
    if (from) {
      temp = { ...from };
    } else {
      temp = null;
    }
    if (to) {
      temp2 = { ...to };
    } else {
      temp2 = null;
    }
    setFrom(temp2);
    setTo(temp);
  }

  function handleSelect(i: number) {
    let temp = { ...tokens[i], value: 0, max: 0 };
    if (side === "from") {
      setFrom(temp);

    } else if (side === "to") {
      setTo(temp);
    }
    setCurrShow(false);
    setPage(0)
    setRowsPerPage(10)
  }

  const promiseHandler = (id: any, count: any, callback: any) => {
    return new Promise((resolve) => {
      callback()
        .then((response: any) => {
          setLoading({
            all: 28,
            loaded: loading.loaded + count
          });
          if (id === 'paraswap') {
            response = response.data.priceRoute;
          }
          resolve({
            id,
            result: response,
          })
        })
        .catch((error: any) => {
          setLoading({
            all: 28,
            loaded: loading.loaded + count
          });
          resolve({
            id,
            result: undefined
          })
        })
    });
  };

  const getParaswapSortedRates = (rates: any) => {
    console.log(rates.others, 'paraswap');
    return _.orderBy(rates.others, ["rate"], ["desc"]);
  };

  const getSortedRates = (response: any, type: any) => {
    if (!response) return [];
    switch (type) {
      case "paraswap": {
        return getParaswapSortedRates(response);
      }
      default: {
        return response.hasOwnProperty("data") ? response.data : response;
      }
    }
  };

  const transformRates = (rates: any) => {
    let result = [];
    for (let i in rates) {
      const key = rates[i][0];
      const apiRates = rates[i][1];
      switch (key) {
        case "1inch": {
          if (apiRates && typeof apiRates.toTokenAmount === "string") {
            result.push({
              rate: apiRates.toTokenAmount / 10 ** apiRates.toToken.decimals,
              platform: "oneInch",
              source: "1inch",
            });
          }
          break;
        }
        case "paraswap": {
          if (apiRates) {
            apiRates.forEach((rate: any) => {
              if (supportedDEXes["paraswap"].includes(rate.exchange)) {
                result.push({
                  rate: rate.unit / 10 ** to.decimals,
                  platform: rate.exchange,
                  source: "paraswap",
                });
              }
            });
          }
          break;
        }
        case "simpleSwap": {
          if (apiRates.rate !== null) {
            result.push({
              rate: Number(apiRates.rate),
              min: Number(apiRates.min || 0),
              max: Number(apiRates.max || 0),
              platform: "simpleSwap",
              source: "simpleSwap",
            });
          }
          break;
        }
        case "stealthex": {
          if (apiRates.estimated_amount !== null) {
            result.push({
              rate: Number(apiRates.estimated_amount),
              min: Number(apiRates.min_amount || 0),
              max: Number(apiRates.max_amount || 0),
              platform: "stealthex",
              source: "stealthex",
            });
          }
          break;
        }
        case 'changeNow': {
          if ((apiRates.hasOwnProperty('rate') && apiRates?.rate?.toAmount) && apiRates.hasOwnProperty('range')) {
            result.push({
              rate: Number(apiRates?.rate?.toAmount || 0),
              rateId: apiRates?.rate?.rateId,
              min: Number(apiRates?.range?.minAmount || 0),
              max: Number(apiRates?.range?.maxAmount || 0),
              platform: "changeNow",
              source: "changeNow",
            })
          }
          break;
        }
        case 'sideShift': {
          if (apiRates.hasOwnProperty('rate')) {
            result.push({
              rate: Number(apiRates?.rate || 0),
              min: Number(apiRates?.min || 0),
              max: Number(apiRates?.max || 0),
              platform: "sideShift",
              source: "sideShift",
            })
          }
          break;
        }
      }
    }

    return result;
  };

  const getComponentsQuantity = async (setToken: any) => {
    let _com_addresses: Array<string> = [];
    let _com_quantities: Array<BigNumber> = [];
    let _need_quantities: Array<BigNumber> = [];
    let _to_amount = new BigNumber(0);

    // console.log("SetToken: ", setToken);
    console.log("Settoken address ",setToken.address)
    const RSetToken_contract = loadContract(
      library,
      RSetToken_ABI,
      setToken.address
    );
    const setToken_naturalUnit = await RSetToken_contract.methods.naturalUnit().call();
    console.log("setToken_naturalUnit",setToken_naturalUnit);

    const setToken_unitShare = await RSetToken_contract.methods.unitShares().call();
    console.log("setToken_unitShare",setToken_unitShare);

    const baseSetToken_address = await RSetToken_contract.methods.currentSet().call();
    console.log("baseSetToken_address",baseSetToken_address);

    const baseSetToken_contract = loadContract(
      library,
      SetToken_ABI,
      baseSetToken_address
    );
    const baseSetToken_naturalUnit = await baseSetToken_contract.methods.naturalUnit().call();
    console.log("baseSetToken_naturalUnit",baseSetToken_naturalUnit);

    const baseSetToken_getUnits = await baseSetToken_contract.methods.getUnits().call();
    console.log("baseSetToken_getUnits ", baseSetToken_getUnits);

    const baseSetToken_getComponents = await baseSetToken_contract.methods.getComponents().call();
    console.log("baseSetToken_getComponents ", baseSetToken_getComponents);

    let com_counts = baseSetToken_getComponents.length;

    for (let index = 0; index < com_counts; index++) {
      console.log("item address: ",baseSetToken_getComponents[index]);

      let contract = loadContract(
        library,
        ERC20_ABI,
        baseSetToken_getComponents[index]
      );
      const component_decimals = await contract.methods.decimals().call();
      let quantity = new BigNumber(0);
      const component_unit = baseSetToken_getUnits[index];
      let _quantity = new BigNumber(10 ** 18).div(new BigNumber(setToken_naturalUnit)).times(new BigNumber(setToken_unitShare));
      const mm = _quantity.mod(new BigNumber(baseSetToken_naturalUnit));
      if (mm.isGreaterThan(0)) {
        _quantity = _quantity.minus(mm).plus(new BigNumber(baseSetToken_naturalUnit));
      }
      quantity = _quantity.div(new BigNumber(baseSetToken_naturalUnit)).times(new BigNumber(component_unit));
      // quantity = quantity.plus(quantity.div(50));
      console.log("item quantity",quantity.toNumber());

      let component_price = await getTokenPriceByAddress(baseSetToken_getComponents[index]);
      let to_price = await getTokenPriceByAddress(to.address);
      // console.log("prices: ", component_price, to_price);

      component_price = new BigNumber(component_price);
      to_price = new BigNumber(to_price);

      let need_amount = component_price.div(to_price).times(quantity).div(10 ** parseFloat(component_decimals)).times(10 ** to.decimals);
      if (buySell === "Buy") {
        need_amount = need_amount.times(102).div(100);
      }
      _to_amount = _to_amount.plus(need_amount);
      console.log("need_amount",need_amount.toNumber());



      _com_addresses.push(baseSetToken_getComponents[index]);
      _com_quantities.push(quantity);
      _need_quantities.push(need_amount);

    }
    const toamount = _to_amount.div(new BigNumber(10 ** to.decimals)).toNumber();
    console.log("toamount: ",toamount);
    setSelectedBuyRate(toamount);
    setComAddressses([..._com_addresses]);
    setComQuantities([..._com_quantities]);
    setNeedQuantities([..._need_quantities]);

  }

  const fetchPrices = async (deposit: any, destination: any) => {
    if (deposit !== null && destination !== null) {

      setFetchLoading(true);

      let deposit_price = deposit.price_usd;
      let destination_price = await getTokenPrice(destination);

      // console.log("price_usd: ", deposit_price, destination_price);

      setSelectedRate(parseFloat(deposit_price) / parseFloat(destination_price));

      setFetchLoading(false);

    }
  };

  useEffect(() => {
    return (() => {
      clearInterval(priceInterval);
    })
  }, []);


  useEffect(() => {
    let priceInterval: any = null;
    if (from && to) {
      fetchPrices(from, to);
      // getComponentsQuantity(from);
      // if (account && library) {

      // console.log("toMax: ", toMax);
      // console.log("com_addresses: ", com_addresses ? com_addresses[0] : "");
      // console.log("com_quantities: ", com_quantities ? com_quantities[0].toNumber() : "");

      // }


      // priceInterval = setInterval(() => {
      //   setFrom((curFrom: any) => {
      //     if (curFrom.symbol !== from.symbol) {
      //       clearInterval(priceInterval);
      //     }
      //     return curFrom;
      //   })
      //   setTo((curTo: any) => {
      //     if (curTo.symbol !== to.symbol) {
      //       clearInterval(priceInterval);
      //     }
      //     return curTo;
      //   })
      //   getNewPrice(from, to);
      // }, 10000)
    }
    // return (() => {
    //   clearInterval(priceInterval);
    // })
  }, [from, to]);

  const getNewPrice = async (deposit: any, destination: any) => {

    if (deposit !== null && destination !== null) {


      let deposit_price = deposit.price_usd;
      let destination_price = await getTokenPrice(destination);

      // console.log("price_usd: ", deposit_price, destination_price);

      setSelectedRate(parseFloat(deposit_price) / parseFloat(destination_price));

    }
  }


  function handleValue(v: any, side: string) {

    if (side === "from") {
      let temp = { ...from };
      temp.value = v;
      setFromMax(v);
      setToMax(parseFloat(v) * parseFloat(selectedRate));
    }
  }

  const oneInchBuyHandler = async (deposit: any, destination: any, amount: BigNumber) => {
    try {
      let canExchange = false;
      let pending = false;
      setBuyState("initializing");
      let allowance = ZERO;

      const spenderRes = await api.oneInch.get("spender");
      const spender = spenderRes.data.address;

      let fromAmount = amount;

      if (deposit.symbol.toUpperCase() !== "ETH") {
        setBuyState("allowance");

        let contract = loadContract(
          library,
          ERC20_ABI,
          deposit.address
        );

        allowance = await contract.methods.allowance(account, spender).call();
        allowance = new BigNumber(allowance);

        if (fromAmount.isGreaterThan(allowance)) {
          setBuyState("approving");
          const maxAllowance = new BigNumber(2).pow(256).minus(1);
          await contract.methods.approve(spender, maxAllowance.toFixed(0)).send({ from: account }).on('receipt', (receipt: any) => {
            pending = false;
            canExchange = true;
          }).on('error', (err: any) => {
            pending = true;
            canExchange = false
          })

        } else {
          canExchange = true;
        }
      } else {
        canExchange = true;
      }

      if (canExchange) {
        if (deposit.symbol.toUpperCase() !== "ETH" && pending) {
          let contract = loadContract(
            library,
            ERC20_ABI,
            deposit.address
          );

          allowance = await contract.methods.allowance(account, spender);
          allowance = new BigNumber(allowance);

          if (fromAmount.isGreaterThan(allowance)) {
            addToast('Approval Pending', {
              appearance: 'error',
              autoDismiss: true,
            });
            return false;
          }
        }

        setBuyState("create_tx");

        const res = await api.oneInch.get("swap", {
          fromTokenAddress: deposit.address,
          toTokenAddress: destination.address,
          amount: fromAmount.toNumber(),
          fromAddress: account,
          slippage: slippage,
          destReceiver: account,
        });
        let tx = res.data.tx;

        setBuyState("send_tx");

        library.eth.sendTransaction(tx, async (err: any, transactionHash: any) => {
          if (err) {
            setBuyState("failed");

            if (err.code === 4001) {
              addToast("errors.canceled", {
                appearance: 'error',
                autoDismiss: true,
              });

            } else {
              addToast("errors.default", {
                appearance: 'error',
                autoDismiss: true,
              });
            }
            return false;
          }

          setBuyState("submitted");
          addToast("1inch swap has been successfully submitted!", {
            appearance: 'success',
            autoDismiss: true,
          });
        });
      } else {
        addToast("errors.approvalPending", {
          appearance: 'error',
          autoDismiss: true,
        });
      }
    } catch (e: any) {
      setBuyState("failed");
      console.log(e);
      if (e.hasOwnProperty("code")) {
        if (e.code === 4001) {
          addToast("errors.canceled", {
            appearance: 'error',
            autoDismiss: true,
          });
        } else {
          addToast("errors.default", {
            appearance: 'error',
            autoDismiss: true,
          });
        }
      } else {
        if (e.hasOwnProperty("response")) {
          if (e.response.status === 500) {
            if (e.response.data.hasOwnProperty("errors")) {
              e.response.data.errors.map((err: any) => {
                addToast(err.msg, {
                  appearance: 'error',
                  autoDismiss: true,
                });
              });
            } else {
              addToast("errors.unavailablePair", {
                appearance: 'error',
                autoDismiss: true,
              });
            }
          } else {

            addToast("errors.default", {
              appearance: 'error',
              autoDismiss: true,
            });
          }
        } else {
          addToast("errors.default", {
            appearance: 'error',
            autoDismiss: true,
          });
        }
      }
    }
  };

  async function handleButton() {
    if (!active && !account) {
      setShow(!show);
    } else if (selectedRate && selectedBuyRate) {
      // console.log("com_quantities:", com_quantities?.map((item: any) => {
      //   return item.div(10**18).toNumber();
      // }));
      // console.log("need_quantities:", need_quantities?.map((item: any) => {
      //   return item.div(10**18).toNumber();
      // }));
      // console.log("com_addresses:", com_addresses);
      if (!com_addresses || !com_quantities || !need_quantities) return 0;
      const component_counts = com_addresses ? com_addresses.length : 0;
      





      if (buySell === "Buy") {

        setBuySellState("swapping...");
        let canBuy =false;


        for (let index = 0; index < component_counts; index++) {
          if (com_addresses[index] === to.address || (com_addresses[index] == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" && to.symbol === "ETH")) {
            continue;
          }
          const from_token = to;
          let to_token = {
            address: com_addresses[index],
            symbol:""
          };
          if (com_addresses[index] == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
            to_token = config.walletTokens[2];
          }
  
          const beforeToTokenBalance =await getCoinBalance(account,active,library,to_token);
          const swap_amount = need_quantities[index].times(new BigNumber(fromMax));
          
          console.log("swapping: ",from_token, to_token, com_quantities[index].div(10**18).toNumber()  , swap_amount.div(10**18).toNumber());

          const res = await oneInchBuyHandler(from_token, to_token, swap_amount);
          
          const afterToTokenBalance =await getCoinBalance(account,active,library,to_token);
  
          if (new BigNumber(afterToTokenBalance-beforeToTokenBalance).isGreaterThanOrEqualTo(com_quantities[index])){
            canBuy = true;
            console.log("swaped enough amount");
          }else{
            canBuy = false;
            console.log("swap amount not enough");
          }
  
  
        }
        // const res = await buySetToken(account, active, library, from, new BigNumber(fromMax).times(10 ** 18), to, setBuySellState);
        // console.log(res);
      } else {
        const res = await sellSetToken(account, active, library, from, new BigNumber(fromMax).times(10 ** 18), to, setBuySellState);
        console.log(res);

      }


    }
  }



  const handleBuySellChange = (event: React.SyntheticEvent, newValue: string) => {
    setBuySell(newValue);
  };

  const html = (<Modal show={show1} onHide={setShow1} size="lg">

    <div className="col-md-12" style={{ padding: "0px" }} >
      {<div className="card color-box">
        <Box sx={{ width: '100%', marginBottom: '10px' }}>
          <Tabs
            value={buySell}
            onChange={handleBuySellChange}
            textColor="secondary"
            indicatorColor="secondary"
            aria-label="secondary tabs example"
            selectionFollowsFocus
          >
            <Tab style={{ fontSize: "30px", width: "50%" }} value="Buy" label="Buy" />
            <Tab style={{ fontSize: "30px", width: "50%" }} value="Sell" label="Sell" />
          </Tabs>
        </Box>

        {fetchloading && false ? <Load loaded={loading} /> :
          <Fragment>
            <SwapCard switchHandler={switchHandler} side="from" val={fromMax} balance={fromBalance} onChangeBalance={onChangeBalance} setSide={setSide} show={currShow} setShow={setCurrShow} handleValue={handleValue} address={from ? from.address : null} selected={from} from={from} to={to} buySell={buySell} buySellState={BuySellState} />
            <SwapCard side="to" val={fromMax} balance={toBalance} rate={buySell === "Buy" ? selectedBuyRate : selectedRate} address={to ? to.address : null} onChangeBalance={onChangeBalance} setSide={setSide} show={currShow} setShow={setCurrShow} hanleValue={handleValue} selected={to} from={from} to={to} buySell={buySell} buySellState={BuySellState} />
          </Fragment>}

        <button onClick={handleButton} disabled={toMax <= 0 || fromMax <= 0 || isInsufficient || !selectedRate} type="button" className="btn btn-approve btn-block mt-3">
          {!active && !account ?
            "Connect" :
            !selectedRate ?
              "Select A coin" :
              isInsufficient ?
                "Insufficient Balance" :
                BuySellState ?
                  BuySellState :
                  buySell
          }
        </button>
      </div>}
    </div>


    <CoinModal show={currShow} setShow={setCurrShow} handleCurr={handleSelect} currencies={tokens} />
    <ConfModal show={swapData.show} closeHandler={setSwapData} data={swapData} platform={swapData.platform} id={swapData.id} address={swapData.address} />
    <ModalConnect show={show} setShow={setShow} />


  </Modal>);
  return html;
}

export default BuySellModal;